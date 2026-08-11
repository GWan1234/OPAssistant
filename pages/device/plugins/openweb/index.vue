<template>
	<view class="container">
		<oa-countdown-action
		<oa-card :title="$t('openweb.advanced')" divider padding="lg">
			<text class="adv-hint">{{ $t('openweb.advanced_hint') }}</text>
			
			<view class="url-box" v-if="webUrl">
				<text class="url-text">{{ webUrl }}</text>
			</view>

			<view class="adv-actions">
				<oa-button type="positive" block @click="openExternal">{{ $t('openweb.open_web') }}</oa-button>
				<oa-button type="neutral" block @click="copyUrl" class="btn-copy">{{ $t('common.copy_url') || '复制链接' }}</oa-button>
			</view>
		</oa-card>
	</view>
</template>

<script>
import DeviceManager from '@/utils/device-manager.js'

export default {
	data() {
		return {
			webUrl: ''
		}
	},
	onLoad() {
		uni.setNavigationBarTitle({ title: this.$t('openweb.advanced') })
		this.generateUrl()
	},
	methods: {
		generateUrl() {
			const d = DeviceManager.getCurrentDevice() || {}
			const proto = d.useHttps ? 'https' : 'http'
			// 如果没有 IP，则给个空字符串，避免 undefined
			if (!d.ip) return
			
			const host = DeviceManager.formatHostForUrl(d.ip)
			this.webUrl = `${proto}://${host}:${d.port}/cgi-bin/luci/`
		},
		openExternal() {
			if (!this.webUrl) {
				uni.showToast({ title: this.$t('common.load_failed'), icon: 'none' })
				return
			}
			
			const url = this.webUrl
			
			// #ifdef APP-PLUS
			if (typeof plus !== 'undefined' && plus.runtime && plus.runtime.openURL) {
				plus.runtime.openURL(url)
			} else {
				this.copyUrl()
			}
			// #endif
			
			// #ifdef H5
			window.open(url, '_blank')
			// #endif
		},
		copyUrl() {
			if (!this.webUrl) return
			
			uni.setClipboardData({ 
				data: this.webUrl,
				success: () => {
					uni.showToast({ title: this.$t('openweb.copied_url'), icon: 'none' })
				}
			})
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

.adv-hint { 
	display: block; 
	font-size: $oa-fs-caption; 
	color: $oa-text-muted; 
	line-height: 1.5; 
	margin-bottom: $oa-sp-3; 
}

.url-box {
	background-color: #f6f7f9; /* 移除了不存在的 $oa-bg-subtle 变量 */
	padding: $oa-sp-2;
	border-radius: 8rpx;
	margin-bottom: $oa-sp-4;
	word-break: break-all;
}

.url-text {
	font-size: $oa-fs-caption;
	color: $oa-text-subtle;
}

.adv-actions { 
	display: flex; 
	flex-direction: column;
}

.btn-copy {
	margin-top: $oa-sp-2;
}
</style>