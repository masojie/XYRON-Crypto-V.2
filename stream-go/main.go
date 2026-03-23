package main

import (
    "fmt"
    "net"
    "os"
)

func main() {
    fmt.Println("XYRON NEXUS STREAM - GO")
    fmt.Println("Node.js → Go → Rust Bridge")

    home := os.Getenv("HOME")
    goSocket := home + "/xyron-go.sock"
    rustSocket := home + "/xyron-core.sock"

    fmt.Printf("Socket Node: %s\n", goSocket)
    fmt.Printf("Socket Rust: %s\n", rustSocket)

    os.Remove(goSocket)

    listener, err := net.Listen("unix", goSocket)
    if err != nil {
        fmt.Printf("Fatal error: %v\n", err)
        return
    }
    defer listener.Close()

    os.Chmod(goSocket, 0777)

    fmt.Println("Status: PIP")
    fmt.Printf("[NEXUS-GO] Server ready at %s\n", goSocket)

    for {
        conn, err := listener.Accept()
        if err != nil {
            fmt.Printf("Accept error: %v\n", err)
            continue
        }
        go handleConnection(conn, rustSocket)
    }
}

func handleConnection(conn net.Conn, rustSocket string) {
    defer conn.Close()

    rustConn, err := net.Dial("unix", rustSocket)
    if err != nil {
        fmt.Printf("[NEXUS-GO] Cannot connect to Rust: %v\n", err)
        conn.Write([]byte("PIP PIP - Rust offline"))
        return
    }
    defer rustConn.Close()

    buf := make([]byte, 1024)
    n, _ := conn.Read(buf)
    rustConn.Write(buf[:n])

    n, _ = rustConn.Read(buf)
    conn.Write(buf[:n])

    fmt.Printf("[NEXUS-GO] Request forwarded to Rust\n")
}
