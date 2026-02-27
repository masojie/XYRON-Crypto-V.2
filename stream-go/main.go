package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net"
    "os"
    "sync"
    "time"
    "runtime"
)

// ============================================================================
// CONSTANTS
// ============================================================================
const (
    RUST_SOCKET = "/tmp/xyron-core.sock" // Socket ke Rust
    NODE_SOCKET = "/tmp/xyron-go.sock"   // Socket dari Node
    BUFFER_SIZE = 65536
    MAX_WORKERS = 4
    MAX_SMS_LEN = 160
)

// ============================================================================
// DATA STRUCTURES - SINKRON DENGAN RUST & NODE
// ============================================================================

// ValidationRequest - To Rust Core
type ValidationRequest struct {
    RequestID string  `json:"request_id"`
    NodeID    string  `json:"node_id"`
    SMS       *string `json:"sms,omitempty"`
    Timestamp uint64  `json:"timestamp"`
}

// ValidationResponse - From Rust Core
type ValidationResponse struct {
    RequestID     string  `json:"request_id"`
    NodeID        string  `json:"node_id"`
    SMSEncrypted  *string `json:"sms_encrypted,omitempty"` // SINKRON
    Verified      bool    `json:"verified"`                 // SINKRON
    Signature     string  `json:"signature"`                // SINKRON
    LayersUsed    int     `json:"layers_used"`
    ProcessingTime uint64 `json:"processing_time"`
    Status        string  `json:"status"`
    Timestamp     uint64  `json:"timestamp"`
}

// NodeValidation - From Node.js
type NodeValidation struct {
    WalletID string `json:"wallet_id"`
    Message  string `json:"message,omitempty"`
    TxID     string `json:"tx_id"`
}

// NodeResponse - To Node.js
type NodeResponse struct {
    Status    string      `json:"status"`
    Message   string      `json:"message"`
    Verified  bool        `json:"verified"`            // SINKRON
    Signature string      `json:"signature,omitempty"` // SINKRON
    Data      interface{} `json:"data,omitempty"`
    Timestamp int64       `json:"timestamp"`
}

// ============================================================================
// NEXUS STREAM ENGINE
// ============================================================================

type NexusStream struct {
    rustConn net.Conn
    rustMu   sync.Mutex
    workers  chan struct{}
}

func NewNexusStream() *NexusStream {
    ns := &NexusStream{
        workers: make(chan struct{}, MAX_WORKERS),
    }
    
    for i := 0; i < MAX_WORKERS; i++ {
        ns.workers <- struct{}{}
    }
    
    return ns
}

// Connect to Rust Core
func (ns *NexusStream) connectRust() error {
    ns.rustMu.Lock()
    defer ns.rustMu.Unlock()
    
    if ns.rustConn != nil {
        ns.rustConn.Close()
    }
    
    conn, err := net.Dial("unix", RUST_SOCKET)
    if err != nil {
        return fmt.Errorf("failed to connect to Rust: %v", err)
    }
    
    ns.rustConn = conn
    log.Printf("[NEXUS-GO] Connected to Rust Core | PIP")
    return nil
}

// Send to Rust and get response
func (ns *NexusStream) sendToRust(req *ValidationRequest) (*ValidationResponse, error) {
    ns.rustMu.Lock()
    defer ns.rustMu.Unlock()
    
    if ns.rustConn == nil {
        if err := ns.connectRust(); err != nil {
            return nil, err
        }
    }
    
    data, err := json.Marshal(req)
    if err != nil {
        return nil, err
    }
    
    start := time.Now()
    
    if _, err := ns.rustConn.Write(data); err != nil {
        ns.rustConn.Close()
        ns.rustConn = nil
        return nil, err
    }
    
    buffer := make([]byte, BUFFER_SIZE)
    n, err := ns.rustConn.Read(buffer)
    if err != nil {
        return nil, err
    }
    
    elapsed := time.Since(start).Microseconds()
    
    var resp ValidationResponse
    if err := json.Unmarshal(buffer[:n], &resp); err != nil {
        return nil, err
    }
    
    log.Printf("[NEXUS-GO] Rust response in %dμs | Verified: %v | Signature: %s | SMS Encrypted: %v",
        elapsed, resp.Verified, resp.Signature[0:20], resp.SMSEncrypted != nil)
    
    return &resp, nil
}

// Handle Node.js connection
func (ns *NexusStream) handleNodeConnection(conn net.Conn) {
    defer conn.Close()
    
    <-ns.workers
    defer func() { ns.workers <- struct{}{} }()
    
    buffer := make([]byte, BUFFER_SIZE)
    n, err := conn.Read(buffer)
    if err != nil {
        log.Printf("[NEXUS-GO] Error reading from Node: %v", err)
        return
    }
    
    var nodeVal NodeValidation
    if err := json.Unmarshal(buffer[:n], &nodeVal); err != nil {
        log.Printf("[NEXUS-GO] Invalid JSON from Node: %v", err)
        json.NewEncoder(conn).Encode(NodeResponse{
            Status:    "error",
            Message:   "PIP PIP",
            Verified:  false,
            Timestamp: time.Now().UnixMilli(),
        })
        return
    }
    
    log.Printf("[NEXUS-GO] Received from Node - Wallet: %s", nodeVal.WalletID)
    
    // Truncate SMS if too long
    var smsPtr *string
    if nodeVal.Message != "" {
        truncated := nodeVal.Message
        if len(truncated) > MAX_SMS_LEN {
            truncated = truncated[:MAX_SMS_LEN]
        }
        smsPtr = &truncated
    }
    
    // Forward to Rust
    req := &ValidationRequest{
        RequestID: nodeVal.TxID,
        NodeID:    nodeVal.WalletID,
        SMS:       smsPtr,
        Timestamp: uint64(time.Now().Unix()),
    }
    
    resp, err := ns.sendToRust(req)
    
    if err != nil || resp == nil {
        json.NewEncoder(conn).Encode(NodeResponse{
            Status:    "error",
            Message:   "PIP PIP",
            Verified:  false,
            Timestamp: time.Now().UnixMilli(),
        })
        log.Printf("[NEXUS-GO] Validation failed for wallet %s | Status: PIP PIP", nodeVal.WalletID)
    } else {
        // Forward Rust response back to Node
        json.NewEncoder(conn).Encode(NodeResponse{
            Status:    "success",
            Message:   resp.Status,
            Verified:  resp.Verified,
            Signature: resp.Signature,
            Data:      resp,
            Timestamp: time.Now().UnixMilli(),
        })
        
        smsStatus := "NO"
        if resp.SMSEncrypted != nil {
            smsStatus = "YES"
        }
        
        log.Printf("[NEXUS-GO] Forwarded to Node - Wallet: %s | Verified: %v | SMS: %s | Status: %s",
            nodeVal.WalletID, resp.Verified, smsStatus, resp.Status)
    }
}

// Start server
func (ns *NexusStream) Start() error {
    os.Remove(NODE_SOCKET)
    
    listener, err := net.Listen("unix", NODE_SOCKET)
    if err != nil {
        return fmt.Errorf("failed to listen: %v", err)
    }
    
    os.Chmod(NODE_SOCKET, 0777)
    
    log.Printf("[NEXUS-GO] Server ready at %s", NODE_SOCKET)
    log.Printf("[NEXUS-GO] Waiting for Node.js connections | PIP")
    
    if err := ns.connectRust(); err != nil {
        log.Printf("[NEXUS-GO] Warning: %v - will reconnect on demand", err)
    }
    
    for {
        conn, err := listener.Accept()
        if err != nil {
            log.Printf("[NEXUS-GO] Accept error: %v", err)
            continue
        }
        
        go ns.handleNodeConnection(conn)
    }
}

// ============================================================================
// GO.MOD (WAJIB ADA)
// ============================================================================
/*
module xyron-stream

go 1.21

require github.com/google/uuid v1.3.1
*/

// ============================================================================
// MAIN
// ============================================================================

func main() {
    log.SetFlags(log.Ldate | log.Ltime | log.Lmicroseconds)
    
    fmt.Println(`
╔════════════════════════════════════════════════════════════╗
║         XYRON NEXUS STREAM - GO                            ║
║         Node.js → Go → Rust Bridge                         ║
║         Socket Node: /tmp/xyron-go.sock                    ║
║         Socket Rust: /tmp/xyron-core.sock                  ║
║         Status: PIP                                        ║
╚════════════════════════════════════════════════════════════╝
    `)
    
    runtime.GOMAXPROCS(runtime.NumCPU())
    nexus := NewNexusStream()
    
    if err := nexus.Start(); err != nil {
        log.Fatalf("[NEXUS-GO] Fatal error: %v", err)
    }
}
