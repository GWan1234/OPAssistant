<template>
	<view class="container">
		<view class="header" :style="{ height: statusBarHeight }"></view>
		<oa-page-tab :tabs="tabList" v-model="currentTab" />
		<!-- 调试面板（可删除）
		<view class="nav-header" style="display: flex; align-items: center; position: relative;">
			<view style="flex: 1; display: flex; justify-content: center; position: absolute; left: 0; right: 0; pointer-events: none;">
				<text style="font-size: 32rpx; font-weight: bold; color: #fff;">{{ $t('cellular.title') }}</text>
			</view>
		</view>

		<view style="background:#f5f5f5;padding:20rpx;margin:10rpx;border-radius:12rpx;font-size:24rpx;word-break:break-all;">
			<text style="font-weight:bold;">📊 Debug - cellInfoList</text>
			<text>\n{{ JSON.stringify(cellInfoList) }}</text>
		</view>
		 -->

		<scroll-view scroll-y="true" class="scroll-area">
			<view v-if="currentTab === 0">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="modemInfoList.length === 0 && cellInfoList.length === 0" :text="$t('cellular.no_data')" />
				<view v-else>
					<oa-card v-if="modemInfoList.length > 0" padding="lg">
						<view class="iface-header center-icon">
							<view class="operator-wrapper">
								<!-- 带宽 -->
								<view class="bandwidth-box">
									<view class="bandwidth-item">
										<text class="bw-label">↑ {{ $t('cellular.uplink') }}</text>
										<text class="bw-value">{{ getBandwidth('up') }}</text>
									</view>
									<view class="bandwidth-item">
										<text class="bw-label">↓ {{ $t('cellular.downlink') }}</text>
										<text class="bw-value">{{ getBandwidth('down') }}</text>
									</view>
								</view>

								<!-- 运营商图标 -->
								<image class="disk-icon" :src="getOperatorImage(operatorInfoList)" mode="widthFix" style="width: 220rpx; height: 220rpx;" />

								<!-- 温度/电压 -->
								<view class="module-info-box">
									<view class="module-info-item">
										<text class="module-label">{{ $t('cellular.temperature') }}</text>
										<text class="module-value">{{ getModuleInfo('temp') }}</text>
									</view>
									<view class="module-info-item">
										<text class="module-label">{{ $t('cellular.voltage') }}</text>
										<text class="module-value">{{ getModuleInfo('volt') }}</text>
									</view>
								</view>
							</view>

							<!-- 运营商名称 -->
							<view class="iface-protoh">{{ getOperatorName(operatorInfoList) }}</view>
						</view>
						
						<!-- Modem 详细信息 -->
						<view class="iface-body">
							<view class="client-row" v-for="(item, index) in modemInfoList" :key="'info-'+index">
								<text class="label">{{ item.label }}：</text>
								<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
							</view>
						</view>
					</oa-card>

					<!-- Cell 信息 -->
					<oa-card v-if="cellInfoList.length > 0" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.CPEinfo') }}</view>
							<view class="iface-proto">{{ $t('cellular.cell') }}</view>
						</view>
						<view class="iface-body">
							<view class="client-row" v-for="(item, index) in cellInfoList" :key="'cell-'+index">
								<text class="label">{{ item.label }}：</text>
								<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
							</view>
						</view>
					</oa-card>
				</view>
			</view>

			<!-- Tab1: 硬件 -->
			<view v-else-if="currentTab === 1">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="baseInfoList.length === 0" :text="$t('cellular.no_data')" />
				<oa-card v-else padding="lg">
					<view class="dev-header">
						<view class="dev-title">{{ $t('cellular.CPEhardware') }}</view>
						<view class="dev-status up">{{ $t('cellular.normal') }}</view>
					</view>
					<view class="dev-body">
						<view class="client-row" v-for="(item, index) in baseInfoList" :key="'base-'+index">
							<text class="label">{{ item.label }}：</text>
							<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
						</view>
					</view>
				</oa-card>
			</view>

			<!-- Tab2: 设置 -->
			<view v-else-if="currentTab === 2">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="simInfoList.length === 0 && netInfoList.length === 0" :text="$t('cellular.no_data')" />
				<view v-else>
					<oa-card v-if="simInfoList.length > 0" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.sim_card_status') }}</view>
							<view class="iface-proto">{{ $t('cellular.sim') }}</view>
						</view>
						<view class="iface-body">
							<view class="client-row" v-for="(item, index) in simInfoList" :key="'sim-'+index">
								<text class="label">{{ item.label }}：</text>
								<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
							</view>
						</view>
					</oa-card>

					<oa-card v-if="netInfoList.length > 0" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.CPEsetting') }}</view>
							<view class="iface-proto">{{ $t('cellular.network_tag') }}</view>
						</view>
						<view class="iface-body">
							<view class="client-row" v-for="(item, index) in netInfoList" :key="'net-'+index">
								<text class="label">{{ item.label }}：</text>
								<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
							</view>
						</view>
					</oa-card>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import DeviceManager from '@/utils/device-manager.js'

export default {
	data() {
		return {
			statusBarHeight: 0,
			currentTab: 0,
			session: '',
			url: '/ubus',
			deviceInfo: {},
			modemInfoList: [],
			cellInfoList: [],
			baseInfoList: [],
			netInfoList: [],
			simInfoList: [],
			isLoading: false,
			requestLock: false
		}
	},
	computed: {
		tabList() {
			return [
				{ value: 0, label: this.$t('cellular.CPEinfo') },
				{ value: 1, label: this.$t('cellular.CPEhardware') },
				{ value: 2, label: this.$t('cellular.CPEsetting') }
			]
		},
		operatorInfoList() {
			return [
				...(this.modemInfoList || []),
				...(this.cellInfoList || []),
				...(this.simInfoList || [])
			]
		}
	},
	onLoad() {
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight + 'rpx';
		uni.setNavigationBarTitle({ title: this.$t('cellular.title') })
		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
		this.loadCurrentTabData()
	},
	onShow() {
		uni.setNavigationBarColor({
			frontColor: '#000000',
			backgroundColor: '#F8F8F8'
		})
	},
	onPullDownRefresh() {
		Promise.resolve(this.loadCurrentTabData()).finally(() => uni.stopPullDownRefresh())
	},
	watch: {
		currentTab(newVal, oldVal) {
			if (newVal !== oldVal) {
				this.loadCurrentTabData()
			}
		}
	},
	methods: {
		goBack() { 
			uni.reLaunch({ url: '/pages/device_list' }) 
		},
		sleep(ms) { 
			return new Promise(resolve => setTimeout(resolve, ms)); 
		},

		fetchDataPromise(methodName) {
			return new Promise((resolve) => {
				uni.request({
					method: 'POST',
					url: this.url,
					data: {
						jsonrpc: '2.0', id: 1, method: 'call',
						params: [this.session, 'qmodem', methodName, { config_section: '1_1_4' }]
					},
					header: { 'Content-Type': 'application/json' },
					timeout: 8000,
					success: (res) => resolve(res),
					fail: (err) => { 
						console.error('请求失败:', err);
						resolve(null); 
					}
				});
			});
		},

		getApiListByTab(tabIndex) {
			switch(tabIndex) {
				case 0: return [{ name: 'info', key: 'modemInfoList' }, { name: 'cell_info', key: 'cellInfoList' }];
				case 1: return [{ name: 'base_info', key: 'baseInfoList' }];
				case 2: return [{ name: 'sim_info', key: 'simInfoList' }, { name: 'network_info', key: 'netInfoList' }];
				default: return [];
			}
		},

		async loadCurrentTabData() {
			if (this.requestLock) return;
			this.requestLock = true;
			this.isLoading = true;

			const currentTasks = this.getApiListByTab(this.currentTab);
			currentTasks.forEach(task => { this[task.key] = [] });

			try {
				for (let i = 0; i < currentTasks.length; i++) {
					const task = currentTasks[i];
					const res = await this.fetchDataPromise(task.name);
					if (res && res.data && res.data.result) {
						this[task.key] = this.transformToKvArray(res, task.name);
					}
					if (i < currentTasks.length - 1) await this.sleep(500);
				}
			} catch (err) {
				console.error('加载数据失败：', err);
			} finally {
				this.isLoading = false;
				this.requestLock = false;
			}
		},

		// ===== 核心修正：安全转换数据 =====
		transformToKvArray(res, type) {
			try {
				if (!res.data || !res.data.result || !res.data.result[1]) return []
				const rawData = res.data.result[1]
				let sourceData = rawData[type] || rawData['modem_info'] || rawData['network_info'] || rawData['sim_info'] || rawData['cell_info'] || rawData

				if (!sourceData) return []

				const processItem = (item) => {
					if (!item) return null
					// 从对象中提取字段
					let key = item.key || ''
					let fullName = item.full_name || ''
					let value = item.value

					// 若没有 key，尝试使用 fullName 作为 key
					if (!key && fullName) key = fullName

					if (!key && fullName) {
						// 如果都没有，跳过该项
						return null
					}

					// 国际化：优先用 fullName，其次用 key
					let label = null
					if (fullName) {
						const i18nKey = `cellular.fields.${fullName}`
						if (this.$te(i18nKey)) {
							label = this.$t(i18nKey)
						}
					}
					if (!label && key) {
						const i18nKey = `cellular.fields.${key}`
						if (this.$te(i18nKey)) {
							label = this.$t(i18nKey)
						}
					}
					if (!label) {
						label = fullName || this.formatLabel(key)
					}

					return {
						rawKey: key,               // 后端的 key（如 "MCC"）
						label: label,
						value: (value !== undefined && value !== null && value !== '') ? String(value) : '--',
						fullName: fullName
					}
				}

				let result = []
				if (Array.isArray(sourceData)) {
					result = sourceData.map(item => processItem(item)).filter(item => item !== null)
				} else if (typeof sourceData === 'object' && sourceData !== null) {
					result = Object.keys(sourceData)
						.map(key => processItem({ key, value: sourceData[key] }))
						.filter(item => item !== null)
				}

				// 过滤掉 rawKey 为空或 "Unknown" 的项（避免显示无用数据）
				return result.filter(item => item.rawKey && item.rawKey !== 'Unknown')
			} catch (e) {
				console.error('transformToKvArray 出错:', e)
				return []
			}
		},

		formatLabel(key) {
			if (!key) return ''
			return key.toString().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
		},

		// ===== 运营商 MCC/MNC 提取（支持更多字段） =====
		getMccMnc(list) {
			let mcc = null, mnc = null
			if (!Array.isArray(list) || list.length === 0) {
				return { mcc, mnc }
			}

			for (let item of list) {
				if (!item) continue
				const rawKey = String(item.rawKey || '').trim()
				const value = String(item.value || '').trim()
				const lowerKey = rawKey.toLowerCase()

				// 直接匹配
				if (lowerKey === 'mcc' || lowerKey === 'home_mcc' || lowerKey.includes('mcc')) {
					mcc = value
				}
				if (lowerKey === 'mnc' || lowerKey === 'home_mnc' || lowerKey.includes('mnc')) {
					mnc = value
				}

				// 组合字段 plmn / operator
				if ((lowerKey.includes('plmn') || lowerKey.includes('operator')) && /^\d{5,6}$/.test(value)) {
					mcc = value.substring(0, 3)
					mnc = value.substring(3)
				}

				// 如果值是 5~6 位数字（后备）
				if ((!mcc || !mnc) && /^\d{5,6}$/.test(value)) {
					mcc = value.substring(0, 3)
					mnc = value.substring(3)
				}

				if (mcc && mnc) break
			}

			// 调试输出（上线后可注释）
			console.log('提取 MCC/MNC:', { mcc, mnc })
			return { mcc, mnc }
		},

		getOperatorImage(list) {
			const { mcc, mnc } = this.getMccMnc(list)
			if (!mcc || !mnc) return '/static/China-Unknown.png'
			const padMnc = mnc.padStart(2, '0')
			if (mcc === '460') {
				if (['00','02','04','07'].includes(padMnc)) return '/static/China-Mobile.png'
				if (['01','06','09'].includes(padMnc)) return '/static/China-Unicom.png'
				if (['03','05','11'].includes(padMnc)) return '/static/China-Telecom.png'
				if (['15'].includes(padMnc)) return '/static/China-Broadcast.png'
			}
			return '/static/China-Unknown.png'
		},

		getOperatorName(list) {
			const { mcc, mnc } = this.getMccMnc(list)
			if (!mcc || !mnc) return this.$t('cellular.operators.unknown')
			const padMnc = mnc.padStart(2, '0')
			if (mcc === '460') {
				if (['00','02','04','07'].includes(padMnc)) return this.$t('cellular.operators.cmcc')
				if (['01','06','09'].includes(padMnc)) return this.$t('cellular.operators.cucc')
				if (['03','05','11'].includes(padMnc)) return this.$t('cellular.operators.ctcc')
				if (['15'].includes(padMnc)) return this.$t('cellular.operators.cbn')
			}
			return this.$t('cellular.operators.unknown')
		},

		// 带宽（保留原逻辑，增加保护）
		getBandwidth(type) {
			const sourceList = [
				...(this.modemInfoList || []),
				...(this.cellInfoList || []),
				...(this.netInfoList || [])
			]
			if (!sourceList.length) return '--'
			const keys = type === 'up' 
				? ['tx_rate','upload','uplink','up_rate','upload_speed','tx_bytes','tx_bitrate','tx','ul_rate','ul_bandwidth','rate_up']
				: ['rx_rate','download','downlink','down_rate','download_speed','rx_bytes','rx_bitrate','rx','dl_rate','dl_bandwidth','rate_down']
			const lowerKeys = keys.map(k => k.replace(/[\s_]/g, '').toLowerCase())
			let item = sourceList.find(i => {
				if (!i || !i.rawKey) return false
				const key = String(i.rawKey).toLowerCase().replace(/[\s_]/g, '')
				return lowerKeys.includes(key)
			})
			if (!item) {
				item = sourceList.find(i => {
					if (!i || !i.rawKey) return false
					const key = String(i.rawKey).toLowerCase()
					return type === 'up' 
						? (key.includes('upload') || key.includes('uplink') || key.includes('tx_'))
						: (key.includes('download') || key.includes('downlink') || key.includes('rx_'))
				})
			}
			if (!item || !item.value || item.value === '--') return '--'
			return item.value
		},

		// 温度/电压
		getModuleInfo(type) {
			const sourceList = [
				...(this.modemInfoList || []),
				...(this.baseInfoList || []),
				...(this.cellInfoList || [])
			]
			if (!sourceList.length) return '--'
			const keys = type === 'temp' 
				? ['temp','temperature','modem_temp','board_temp','module_temp','chip_temp']
				: ['volt','voltage','modem_volt','power_volt','v_in','supply_voltage']
			const lowerKeys = keys.map(k => k.replace(/[\s_]/g, '').toLowerCase())
			let item = sourceList.find(i => {
				if (!i || !i.rawKey) return false
				const key = String(i.rawKey).toLowerCase().replace(/[\s_]/g, '')
				return lowerKeys.includes(key)
			})
			if (!item) {
				item = sourceList.find(i => {
					if (!i || !i.rawKey) return false
					const key = String(i.rawKey).toLowerCase()
					return type === 'temp' ? key.includes('temp') : (key.includes('volt') || key.includes('voltage'))
				})
			}
			if (!item || !item.value || item.value === '--') return '--'
			return item.value
		}
	}
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

page {
	height: 100%;
}
.container {
	padding: 20rpx;
	/* 新增 Flex 布局属性 */
	display: flex;
	flex-direction: column;
	height: 100vh; /* 或者使用 100% */
	box-sizing: border-box; /* 防止 padding 导致内容溢出屏幕 */
}
.header { 
	background: transparent; 
	flex-shrink: 0; /* 防止头部被挤压 */
}
/* 确保 tab 组件也不会被挤压 */
oa-page-tab {
	flex-shrink: 0; 
}

/* 新增 scroll-view 的自适应样式 */
.scroll-area {
	flex: 1; /* 自动撑满下方所有剩余空间 */
	height: 0; /* 必须加 height:0，否则部分小程序的 scroll-view 会失去滚动效果 */
	margin-top: 10rpx; /* 可选，与上方的 tab 拉开一点间隙 */
}
.nav-header { margin-bottom: 20rpx; }

.client-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 8rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}
.client-row:last-child { border-bottom: none; }
.label {
	font-size: 26rpx;
	color: $oa-text-muted;
	font-weight: 500;
	min-width: 120rpx;
	flex-shrink: 0;
}
.value {
	font-size: 26rpx;
	font-weight: bold;
	color: $oa-text;
	text-align: right;
	max-width: 60%;
	word-break: break-all;
	flex: 1;
}

.iface-header, .dev-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}
.iface-header.center-icon {
	flex-direction: column;
	align-items: center;
}

.iface-title, .dev-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}
.iface-proto {
	font-size: 24rpx;
	color: #6572CC;
	font-weight: 500;
	background: #e0e7ff;
	border-radius: 12rpx;
	padding: 6rpx 16rpx;
}
.iface-protoh {
	font-size: 36rpx;
	color: #6572CC;
	font-weight: bold;
	background: #e0e7ff;
	border-radius: 12rpx;
	padding: 6rpx 20rpx;
	margin-top: 10rpx;
}
.iface-body, .dev-body { margin-top: 10rpx; }
.dev-status.up {
	color: #2e7d32;
	background: #e8f5e9;
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	font-size: 24rpx;
}
.disk-icon {
	display: block;
	margin: 0 auto;
}

.operator-wrapper {
	position: relative;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-bottom: 10rpx;
}

.bandwidth-box {
	position: absolute;
	left: 10rpx;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}
.bandwidth-item {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
}
.bw-label {
	font-size: 22rpx;
	color: $oa-text-muted;
}
.bw-value {
	font-size: 26rpx;
	font-weight: bold;
	color: #6572CC;
}

.module-info-box {
	position: absolute;
	right: 10rpx;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	align-items: flex-end;
}
.module-info-item {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
}
.module-label {
	font-size: 22rpx;
	color: $oa-text-muted;
}
.module-value {
	font-size: 26rpx;
	font-weight: bold;
	color: #6572CC;
}
</style>