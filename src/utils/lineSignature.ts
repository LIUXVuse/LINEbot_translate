export async function verifySignature(
    body: string,
    signature: string,
    channelSecret: string
): Promise<boolean> {
    try {
        if (!signature || !channelSecret) {
            console.error('缺少簽名或 Channel Secret');
            return false;
        }

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(channelSecret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );

        const bodyBuffer = encoder.encode(body);
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBuffer);
        
        // 將計算出的簽名轉換為 base64
        const signatureArray = new Uint8Array(signatureBuffer);
        const calculatedSignature = btoa(String.fromCharCode(...signatureArray))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        // 清理接收到的簽名
        const cleanedSignature = signature
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
        
        console.log('簽名驗證詳情:', {
            calculatedSignature,
            receivedSignature: cleanedSignature,
            bodyLength: body.length,
            secretLength: channelSecret.length,
            signatureMatch: calculatedSignature === cleanedSignature
        });

        return calculatedSignature === cleanedSignature;
    } catch (error) {
        console.error('簽名驗證過程中發生錯誤:', error);
        return false;
    }
} 