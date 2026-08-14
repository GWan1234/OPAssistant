
/**
 * AES-256-CBC 加密（替代原 XOR 方案，提升安全性）
 * 原 v1.0.6/v1.0.12 使用 XOR + 硬编码 KEY（安全审查 HIGH），
 * 现升级为 AES-256-CBC + 随机 IV + SHA256 派生 KEY。
 * 密文格式：AES: + base64(IV[16] + ciphertext)
 */
import CryptoJS from 'crypto-js'

const SECRET = 'b9f419548a1a26381522a520f0cf15e8'   // 本地密码加密密钥
const ENCRYPTED_PREFIX = 'AES:'

function deriveKey() {
	return CryptoJS.SHA256(SECRET)   // WordArray，32 字节
}

class Crypto {

	static encrypt(text) {
		if (!text) return ''
		// 幂等处理：如果是已加密字符串，不再重复加密
		if (this.isEncrypted(text)) return text;
		
		try {
			const iv = CryptoJS.lib.WordArray.random(16)
			const key = deriveKey()
			const encrypted = CryptoJS.AES.encrypt(text, key, {
				iv: iv,
				mode: CryptoJS.mode.CBC,
				padding: CryptoJS.pad.Pkcs7
			})
			
			// 拼接 IV + 密文，整体 base64
			const combined = iv.clone().concat(encrypted.ciphertext)
			return ENCRYPTED_PREFIX + CryptoJS.enc.Base64.stringify(combined)
		} catch (e) {
			console.error('加密失败:', e)
			return ''
		}
	}

	static decrypt(cipher) {
		if (!cipher || !cipher.startsWith(ENCRYPTED_PREFIX)) {
			return cipher
		}
		try {
			// 提取 base64 部分
			const base64Str = cipher.substring(ENCRYPTED_PREFIX.length)
			const combined = CryptoJS.enc.Base64.parse(base64Str)
			
			// 标准提取 IV (前 16 字节 = 4 个 word)
			const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16)
			
			// 提取 Ciphertext (去除前 16 字节)
			const ciphertextWords = combined.words.slice(4)
			const ciphertextSigBytes = combined.sigBytes - 16
			const ciphertext = CryptoJS.lib.WordArray.create(ciphertextWords, ciphertextSigBytes)
			
			const decrypted = CryptoJS.AES.decrypt(
				CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext }),
				deriveKey(),
				{ 
					iv: iv, 
					mode: CryptoJS.mode.CBC, 
					padding: CryptoJS.pad.Pkcs7 
				}
			)
			
			const result = decrypted.toString(CryptoJS.enc.Utf8)
			
			// 如果解密出来的字符串为空，说明解密失败（可能是旧密钥或数据损坏）
			if (!result) {
				console.warn('AES 解密结果为空，返回原密文')
				return cipher
			}
			
			return result
		} catch (e) {
			console.error('解密失败:', e)
			return cipher
		}
	}

	static isEncrypted(text) {
		return typeof text === 'string' && text.startsWith(ENCRYPTED_PREFIX)
	}
}

export default Crypto