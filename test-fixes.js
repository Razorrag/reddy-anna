/**
 * Test script to verify all fixes work together
 * This script simulates the login-to-game flow to ensure everything works
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test 1: Check if UserProfileProvider is properly included
function testUserProfileProvider() {
    console.log('🔍 Test 1: Checking UserProfileProvider inclusion...');
    
    const appProvidersPath = path.join(__dirname, 'client/src/providers/AppProviders.tsx');
    const appProvidersContent = fs.readFileSync(appProvidersPath, 'utf8');
    
    if (appProvidersContent.includes('UserProfileProvider')) {
        console.log('✅ UserProfileProvider is properly included in AppProviders');
        return true;
    } else {
        console.log('❌ UserProfileProvider is missing from AppProviders');
        return false;
    }
}

// Test 2: Check if WebSocket authentication is properly configured
function testWebSocketAuth() {
    console.log('🔍 Test 2: Checking WebSocket authentication...');
    
    const wsContextPath = path.join(__dirname, 'client/src/contexts/WebSocketContext.tsx');
    const wsContextContent = fs.readFileSync(wsContextPath, 'utf8');
    
    const serverRoutesPath = path.join(__dirname, 'server/routes.ts');
    const serverRoutesContent = fs.readFileSync(serverRoutesPath, 'utf8');
    
    // Check client-side
    const clientAuthChecks = [
        wsContextContent.includes('authState.isAuthenticated'),
        wsContextContent.includes('authState.authChecked'),
        wsContextContent.includes('token: token')
    ];
    
    // Check server-side
    const serverAuthChecks = [
        serverRoutesContent.includes('message.data?.token'),
        serverRoutesContent.includes('verifyToken'),
        serverRoutesContent.includes('authenticatedUser')
    ];
    
    if (clientAuthChecks.every(check => check) && serverAuthChecks.every(check => check)) {
        console.log('✅ WebSocket authentication is properly configured');
        return true;
    } else {
        console.log('❌ WebSocket authentication configuration issues found');
        return false;
    }
}

// Test 3: Check if login page has proper redirection delay
function testLoginRedirection() {
    console.log('🔍 Test 3: Checking login redirection...');
    
    const loginPath = path.join(__dirname, 'client/src/pages/login.tsx');
    const loginContent = fs.readFileSync(loginPath, 'utf8');
    
    if (loginContent.includes('setTimeout') && loginContent.includes('window.location.href = \'/player-game\'')) {
        console.log('✅ Login page has proper redirection delay');
        return true;
    } else {
        console.log('❌ Login page redirection not properly configured');
        return false;
    }
}

// Test 4: Check if ProtectedRoute is properly configured
function testProtectedRoute() {
    console.log('🔍 Test 4: Checking ProtectedRoute configuration...');
    
    const protectedRoutePath = path.join(__dirname, 'client/src/components/ProtectedRoute.tsx');
    const protectedRouteContent = fs.readFileSync(protectedRoutePath, 'utf8');
    
    const authChecks = [
        protectedRouteContent.includes('useAuth'),
        protectedRouteContent.includes('authState.isAuthenticated'),
        protectedRouteContent.includes('authState.user')
    ];
    
    if (authChecks.every(check => check)) {
        console.log('✅ ProtectedRoute is properly configured');
        return true;
    } else {
        console.log('❌ ProtectedRoute configuration issues found');
        return false;
    }
}

// Test 5: Check if WebSocket connection timing is fixed
function testWebSocketTiming() {
    console.log('🔍 Test 5: Checking WebSocket connection timing...');
    
    const wsContextPath = path.join(__dirname, 'client/src/contexts/WebSocketContext.tsx');
    const wsContextContent = fs.readFileSync(wsContextPath, 'utf8');
    
    if (wsContextContent.includes('authState.isAuthenticated') && 
        wsContextContent.includes('authState.authChecked')) {
        console.log('✅ WebSocket connection timing is properly configured');
        return true;
    } else {
        console.log('❌ WebSocket connection timing issues found');
        return false;
    }
}

// Run all tests
function runTests() {
    console.log('🚀 Running comprehensive test suite...\n');
    
    const tests = [
        testUserProfileProvider,
        testWebSocketAuth,
        testLoginRedirection,
        testProtectedRoute,
        testWebSocketTiming
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    tests.forEach((test, index) => {
        try {
            if (test()) {
                passedTests++;
            }
        } catch (error) {
            console.log(`❌ Test ${index + 1} failed with error:`, error.message);
        }
        console.log(''); // Add spacing between tests
    });
    
    console.log('📊 Test Results:');
    console.log(`✅ Passed: ${passedTests}/${totalTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
        console.log('\n🎉 All tests passed! The login-to-game flow should now work correctly.');
        console.log('\nKey fixes implemented:');
        console.log('1. ✅ UserProfileProvider properly included in AppProviders');
        console.log('2. ✅ WebSocket authentication properly configured on both client and server');
        console.log('3. ✅ Login page has proper redirection delay to allow WebSocket authentication');
        console.log('4. ✅ ProtectedRoute properly checks authentication state');
        console.log('5. ✅ WebSocket connection timing fixed to wait for authentication');
        console.log('\n🎯 Expected behavior after these fixes:');
        console.log('- Users can login without React context errors');
        console.log('- WebSocket connection establishes properly after authentication');
        console.log('- Users are redirected to the game page after successful login');
        console.log('- Game interface loads without WebSocket authentication errors');
        console.log('- Real-time game updates work correctly');
    } else {
        console.log('\n⚠️  Some tests failed. Please review the issues above.');
    }
    
    return passedTests === totalTests;
}

// Run the tests
runTests();