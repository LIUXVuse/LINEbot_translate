export async function verifySignature(
    body: string,
    signature: string,
    channelSecret: string
): Promise<boolean> {
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
    const calculatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

    return calculatedSignature === signature;
} 