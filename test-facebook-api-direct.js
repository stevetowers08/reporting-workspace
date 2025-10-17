// Test Facebook API directly to see how many accounts we can get
import fetch from 'node-fetch';

async function testFacebookAPI() {
    console.log('🔍 Testing Facebook API directly...');
    
    try {
        // Get the access token from environment or database
        const token = process.env.FACEBOOK_ACCESS_TOKEN;
        
        if (!token) {
            console.log('❌ No Facebook access token found in environment');
            console.log('💡 Make sure FACEBOOK_ACCESS_TOKEN is set in your .env file');
            return;
        }
        
        console.log('✅ Found access token');
        
        // Test 1: Get user ad accounts
        console.log('\n🔍 Test 1: User ad accounts');
        const userResponse = await fetch(`https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`);
        const userData = await userResponse.json();
        console.log(`📊 User accounts: ${userData.data?.length || 0}`);
        
        if (userData.data?.length > 0) {
            console.log('First few user accounts:');
            userData.data.slice(0, 3).forEach((acc, i) => {
                console.log(`  ${i+1}. ${acc.name} (${acc.id})`);
            });
        }
        
        // Test 2: Get business managers
        console.log('\n🔍 Test 2: Business managers');
        const businessResponse = await fetch(`https://graph.facebook.com/v22.0/me/businesses?fields=id,name&access_token=${token}`);
        const businessData = await businessResponse.json();
        console.log(`📊 Business managers: ${businessData.data?.length || 0}`);
        
        if (businessData.data?.length > 0) {
            console.log('Business managers:');
            businessData.data.forEach((business, i) => {
                console.log(`  ${i+1}. ${business.name} (${business.id})`);
            });
            
            // Test 3: Get accounts from first business manager
            if (businessData.data.length > 0) {
                const firstBusiness = businessData.data[0];
                console.log(`\n🔍 Test 3: Accounts from "${firstBusiness.name}"`);
                
                // Owned accounts
                const ownedResponse = await fetch(`https://graph.facebook.com/v22.0/${firstBusiness.id}/owned_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`);
                const ownedData = await ownedResponse.json();
                console.log(`📊 Owned accounts: ${ownedData.data?.length || 0}`);
                
                // Client accounts
                const clientResponse = await fetch(`https://graph.facebook.com/v22.0/${firstBusiness.id}/client_ad_accounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`);
                const clientData = await clientResponse.json();
                console.log(`📊 Client accounts: ${clientData.data?.length || 0}`);
                
                const totalFromBusiness = (ownedData.data?.length || 0) + (clientData.data?.length || 0);
                console.log(`📊 Total from this business: ${totalFromBusiness}`);
            }
        }
        
        // Test 4: Get system user accounts (if available)
        console.log('\n🔍 Test 4: System user accounts');
        try {
            const systemResponse = await fetch(`https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`);
            const systemData = await systemResponse.json();
            console.log(`📊 System user accounts: ${systemData.data?.length || 0}`);
        } catch (error) {
            console.log('❌ System user accounts not accessible:', error.message);
        }
        
        console.log('\n🎯 Summary:');
        console.log(`- User accounts: ${userData.data?.length || 0}`);
        console.log(`- Business managers: ${businessData.data?.length || 0}`);
        console.log(`- Total estimated accounts: ${(userData.data?.length || 0) + (businessData.data?.length > 0 ? businessData.data.reduce((total, business) => total + 50, 0) : 0)}`);
        
    } catch (error) {
        console.error('❌ Error testing Facebook API:', error);
    }
}

testFacebookAPI();
