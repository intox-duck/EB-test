
const urls = [
    'https://www.collinsongroup.com/en-GB',
    'https://www.apple.com',
    'https://careers.google.com'
];

urls.forEach(companyUrl => {
    try {
        const urlObj = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
        let extractedCompanyName = urlObj.hostname.replace('www.', '').split('.')[0];
        extractedCompanyName = extractedCompanyName.charAt(0).toUpperCase() + extractedCompanyName.slice(1);
        console.log(`URL: ${companyUrl} -> Extracted: '${extractedCompanyName}'`);
    } catch (e) {
        console.log(e);
    }
});
