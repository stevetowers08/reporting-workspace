#!/bin/bash

echo "🚀 HTTP API TESTER"
echo "=================="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if the tester script exists
if [ ! -f "dev-tools/http-tester.js" ]; then
    echo "❌ HTTP tester script not found. Run from project root."
    exit 1
fi

echo "📋 Available Commands:"
echo "1. Quick GET test: ./test-api.sh get /api/venues"
echo "2. POST test: ./test-api.sh post /api/test '{\"test\":true}'"
echo "3. Config test: ./test-api.sh config test-config.json"
echo "4. Method test: ./test-api.sh methods /api/venues GET POST"
echo "5. Interactive mode: ./test-api.sh interactive"
echo ""

# Set default base URL if not provided
export BASE_URL=${BASE_URL:-"http://localhost:3000"}

# Parse command line arguments
case "$1" in
    "get")
        echo "🔍 Testing GET $2"
        node dev-tools/http-tester.js get "$2"
        ;;
    "post")
        echo "📤 Testing POST $2"
        node dev-tools/http-tester.js post "$2" "$3"
        ;;
    "config")
        echo "📋 Running config tests from $2"
        node dev-tools/http-tester.js config "$2"
        ;;
    "methods")
        echo "🔄 Testing multiple methods on $2"
        shift
        shift
        node dev-tools/http-tester.js methods "$1" "$@"
        ;;
    "interactive")
        echo "🎮 Interactive API Testing Mode"
        echo "Type 'help' for commands, 'quit' to exit"
        echo ""
        
        while true; do
            read -p "api> " cmd
            case $cmd in
                "help")
                    echo "Commands:"
                    echo "  get <endpoint>     - GET request"
                    echo "  post <endpoint> <body> - POST request"
                    echo "  config <file>      - Run config file"
                    echo "  methods <endpoint> - Test all methods"
                    echo "  quit              - Exit"
                    ;;
                "quit"|"exit")
                    echo "👋 Goodbye!"
                    break
                    ;;
                get*)
                    endpoint=$(echo $cmd | cut -d' ' -f2)
                    node dev-tools/http-tester.js get "$endpoint"
                    ;;
                post*)
                    endpoint=$(echo $cmd | cut -d' ' -f2)
                    body=$(echo $cmd | cut -d' ' -f3-)
                    node dev-tools/http-tester.js post "$endpoint" "$body"
                    ;;
                config*)
                    file=$(echo $cmd | cut -d' ' -f2)
                    node dev-tools/http-tester.js config "$file"
                    ;;
                methods*)
                    endpoint=$(echo $cmd | cut -d' ' -f2)
                    node dev-tools/http-tester.js methods "$endpoint"
                    ;;
                *)
                    echo "Unknown command. Type 'help' for available commands."
                    ;;
            esac
            echo ""
        done
        ;;
    *)
        echo "Usage: $0 {get|post|config|methods|interactive} [args...]"
        echo ""
        echo "Examples:"
        echo "  $0 get /api/venues"
        echo "  $0 post /api/test '{\"test\":true}'"
        echo "  $0 config dev-tools/test-config.json"
        echo "  $0 methods /api/venues"
        echo "  $0 interactive"
        echo ""
        echo "Environment Variables:"
        echo "  BASE_URL - Override default base URL (default: http://localhost:3000)"
        ;;
esac
