#!/bin/bash
# Simulator Control API Test Suite
# Tests all major endpoints for story validation and acceptance criteria

echo "🧪 Simulator Control API Test Suite"
echo "=================================="
echo ""

BASE_URL="http://localhost:9090"
FAILED_TESTS=0
TOTAL_TESTS=0

# Test function
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local data=$5
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing ${method} ${endpoint}: "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" "${BASE_URL}${endpoint}")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -X POST -H "Content-Type: application/json" -d "$data" "${BASE_URL}${endpoint}")
    fi
    
    status_code="${response: -3}"
    content="${response%???}"
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ ${description}"
        if [ ! -z "$content" ] && [ "$content" != "null" ]; then
            echo "   Response: ${content:0:80}..."
        fi
    else
        echo "❌ ${description} (Expected: $expected_status, Got: $status_code)"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        if [ ! -z "$content" ]; then
            echo "   Error: ${content:0:100}..."
        fi
    fi
    echo ""
}

# AC4: REST API for External Agent Control

echo "📡 Testing Core API Endpoints (AC4)"
echo "-----------------------------------"

test_endpoint "GET" "/api/health" "200" "Health check endpoint"
test_endpoint "GET" "/api/metrics" "200" "General metrics endpoint"  
test_endpoint "GET" "/api/metrics/performance" "200" "Performance metrics endpoint"

echo "📋 Testing Scenario Management (AC1, AC4)"
echo "----------------------------------------"

test_endpoint "GET" "/api/scenarios" "200" "List all scenarios"
test_endpoint "GET" "/api/scenarios/list" "200" "List scenarios (alternative endpoint)"
test_endpoint "GET" "/api/scenarios/status" "200" "Get scenario status"

echo "💉 Testing Data Injection (AC1, AC4)"
echo "-----------------------------------"

test_endpoint "POST" "/api/inject-data" "200" "Inject NMEA data" '{"type":"nmea","data":"$IIVTG,180.0,T,,M,6.5,N,12.0,K,A*5A"}'

echo "⚠️  Testing Error Simulation (AC2, AC4)"
echo "--------------------------------------"

test_endpoint "POST" "/api/simulate-error" "200" "Simulate connection error" '{"type":"connection","severity":"low","duration":1000}'

echo "📊 Testing Session Management (AC3, AC4)"
echo "---------------------------------------"

test_endpoint "POST" "/api/session/start" "200" "Start test session" '{"name":"bmad-test-session","config":{"duration":30000}}'
test_endpoint "GET" "/api/session/status" "200" "Get session status"

echo "✅ Testing Story Validation (AC2, AC4)"
echo "------------------------------------"

test_endpoint "POST" "/api/story/validate" "200" "Validate story implementation" '{"storyId":"story-7.3","acceptanceCriteria":{"AC1":{"description":"Dev Agent Integration","type":"integration"},"AC4":{"description":"REST API","type":"api_endpoint"}}}'

echo ""
echo "🏁 Test Results Summary"
echo "======================"
PASSED_TESTS=$((TOTAL_TESTS - FAILED_TESTS))
echo "Total Tests: $TOTAL_TESTS"
echo "Passed: $PASSED_TESTS"
echo "Failed: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed! BMAD Integration API is ready for agent workflows."
    exit 0
else
    echo "❌ $FAILED_TESTS test(s) failed. Check the API implementation."
    exit 1
fi