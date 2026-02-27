{ pkgs }: {
  deps = [
    pkgs.rustup
    pkgs.go_1_21
    pkgs.nodejs_18
    pkgs.gcc
    pkgs.gnumake
    pkgs.pkg-config
    pkgs.openssl
    pkgs.openssl.dev
    pkgs.libsodium
    pkgs.libsodium.dev
    pkgs.curl
    pkgs.jq
    pkgs.procps
  ];
  
  env = {
    RUSTFLAGS = "-C target-cpu=generic -C opt-level=3";
    GOFLAGS = "-buildvcs=false";
    NPM_CONFIG_CACHE = "/tmp/npm-cache";
    NODE_ENV = "production";
    OPENSSL_DIR = "${pkgs.openssl.dev}";
    PKG_CONFIG_PATH = "${pkgs.openssl.dev}/lib/pkgconfig";
    LD_LIBRARY_PATH = "${pkgs.libsodium}/lib";
  };
  
  shellHook = ''
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║         XYRON TECHNOLOGY V.2 - ENVIRONMENT READY          ║"
    echo "║         Node.js → Go → Rust | Socket Bridge               ║"
    echo "║         Status: PIP                                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    
    mkdir -p /tmp/npm-cache logs history engine
    
    if ! command -v rustc &> /dev/null; then
      rustup default stable
    fi
    
    echo "Node: $(node --version)"
    echo "Go: $(go version | cut -d' ' -f3)"
    echo "Rust: $(rustc --version | cut -d' ' -f2)"
    echo "Status: PIP"
  '';
}
