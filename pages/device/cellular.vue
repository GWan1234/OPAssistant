<template>
	<view class="container">
		<view class="header" :style="{ height: statusBarHeight}"></view>
		
		<view class="nav-header" style="display: flex; align-items: center; position: relative;">
			<view class="back-btn" @click="goBack" style="z-index: 2;">
				<image class="back-icon" src="/static/back.png" mode="widthFix" style="width: 40rpx; height: 40rpx;" />
			</view>
			<view class="ahead-btn" @click="loadCurrentTabData" style="z-index: 2;">
				<image class="back-icon" src="/static/refresh.png" mode="widthFix" style="width: 40rpx; height: 40rpx;" />
			</view>
			<view style="flex: 1; display: flex; justify-content: center; position: absolute; left: 0; right: 0; pointer-events: none;">
				<text style="font-size: 32rpx; font-weight: bold; color: #fff;">{{ $t('cellular.title') }}</text>
			</view>
		</view>

		<view class="tab-bar">
			<view :class="['tab', currentTab === 0 ? 'active' : '']" @click="currentTab = 0">{{ $t('cellular.CPEinfo') }}</view>
			<view :class="['tab', currentTab === 1 ? 'active' : '']" @click="currentTab = 1">{{ $t('cellular.CPEhardware') }}</view>
			<view :class="['tab', currentTab === 2 ? 'active' : '']" @click="currentTab = 2">{{ $t('cellular.CPEsetting') }}</view>
		</view>

		<scroll-view scroll-y="true" style="height: calc(100vh - 300rpx);">
			
			<view v-if="currentTab === 0">
				<view class="iface-card" v-if="modemInfoList.length > 0">
					<view class="iface-header">
						<image class="disk-icon" src="/static/China-Telecom.png" mode="widthFix" style="width: 250rpx; height: 250rpx;" />
					<view class="iface-protoh">{{ $t('cellular.status') }}</view>
					</view>
					<view class="iface-header">
						<view class="iface-title">{{ $t('cellular.overview') }}</view>
						
					</view>
					<view class="iface-body">
						<view class="iface-row" v-for="(item, index) in modemInfoList" :key="'info-'+index">
							<text class="label">{{ formatLabel(item.label) }}：</text>
							<text class="value">{{ item.value }}</text>
						</view>
					</view>
				</view>

				<view class="iface-card" v-if="cellInfoList.length > 0">
					<view class="iface-header">
						<view class="iface-title">{{ $t('cellular.CPEinfo') }}</view>
						<view class="iface-proto">{{ $t('cellular.cell') }}</view>
					</view>
					<view class="iface-body">
						<view class="iface-row" v-for="(item, index) in cellInfoList" :key="'cell-'+index">
							<text class="label">{{ formatLabel(item.label) }}：</text>
							<text class="value">{{ item.value }}</text>
						</view>
					</view>
				</view>
				<!-- 修改点：加载状态区分 加载中/无数据 -->
				<view v-if="isLoading && currentTab ===0" class="wireless-empty">{{ $t('cellular.loading') }}</view>
				<view v-else-if="modemInfoList.length === 0 && cellInfoList.length === 0" class="wireless-empty">{{ $t('cellular.no_data') }}</view>
			</view>

			<view v-else-if="currentTab === 1">
				<view class="dev-card" v-if="baseInfoList.length > 0">
					<view class="dev-header">
						<view class="dev-title">{{ $t('cellular.CPEhardware') }}</view>
						<view class="dev-status up">{{ $t('cellular.normal') }}</view>
					</view>
					<view class="dev-body">
						<view class="dev-row" v-for="(item, index) in baseInfoList" :key="'base-'+index">
							<text class="label">{{ formatLabel(item.label) }}：</text>
							<text class="value">{{ item.value }}</text>
						</view>
					</view>
				</view>
				<!-- 修改点：加载状态区分 加载中/无数据
				<view v-if="isLoading && currentTab ===1" class="wireless-empty">{{ $t('cellular.loading') }}</view>
				<view v-else class="wireless-empty">{{ $t('cellular.no_data') }}</view>
				 -->
			</view>

			<view v-else-if="currentTab === 2">
				<view class="iface-card" v-if="simInfoList.length > 0">
					<view class="iface-header">
						<view class="iface-title">{{ $t('cellular.sim_card_status') }}</view>
						<view class="iface-proto">{{ $t('cellular.sim') }}</view>
					</view>
					<view class="iface-body">
						<view class="iface-row" v-for="(item, index) in simInfoList" :key="'sim-'+index">
							<text class="label">{{ formatLabel(item.label) }}：</text>
							<text class="value">{{ item.value }}</text>
						</view>
					</view>
				</view>

				<view class="iface-card" v-if="netInfoList.length > 0">
					<view class="iface-header">
						<view class="iface-title">{{ $t('cellular.CPEsetting') }}</view>
						<view class="iface-proto">{{ $t('cellular.network_tag') }}</view>
					</view>
					<view class="iface-body">
						<view class="iface-row" v-for="(item, index) in netInfoList" :key="'net-'+index">
							<text class="label">{{ formatLabel(item.label) }}：</text>
							<text class="value">{{ item.value }}</text>
						</view>
					</view>
				</view>
				<!-- 修改点：加载状态区分 加载中/无数据 -->
				<view v-if="isLoading && currentTab ===2" class="wireless-empty">{{ $t('cellular.loading') }}</view>
				<view v-else-if="simInfoList.length === 0 && netInfoList.length === 0" class="wireless-empty">{{ $t('cellular.no_data') }}</view>
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
			// ====== 新增核心状态 开始 ======
			isLoading: false, // 是否正在加载数据
			requestLock: false // 请求锁：防止快速切换tab触发重复请求
			// ====== 新增核心状态 结束 ======
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
		
		this.loadCurrentTabData() // 初始化加载默认tab数据
	},
	// ====== 核心修改：监听tab切换，精准加载对应数据 ======
	watch: {
		currentTab(newVal, oldVal) {
			if(newVal !== oldVal) {
				this.loadCurrentTabData() // 切换tab时，只加载当前tab需要的数据
			}
		}
	},
	methods: {
		goBack() { uni.reLaunch({ url: '/pages/device_list' }) },
		
		sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

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
					fail: (err) => { resolve(null); }
				});
			});
		},
		
		// ====== 新增：根据当前tab获取【专属的接口列表】核心方法 ======
		getApiListByTab(tabIndex) {
			switch(tabIndex) {
				case 0: return [{ name: 'info', key: 'modemInfoList' }, { name: 'cell_info', key: 'cellInfoList' }];
				case 1: return [{ name: 'base_info', key: 'baseInfoList' }];
				case 2: return [{ name: 'sim_info', key: 'simInfoList' }, { name: 'network_info', key: 'netInfoList' }];
				default: return [];
			}
		},
		
		// ====== 重构核心方法：只加载【当前tab】的对应数据，替代原来的全量请求 ======
		async loadCurrentTabData() {
			// 防重复请求：如果正在请求，直接返回
			if(this.requestLock) return;
			this.requestLock = true;
			this.isLoading = true;
			
			// 1. 获取当前tab需要请求的接口列表
			const currentTasks = this.getApiListByTab(this.currentTab);
			// 2. 清空当前tab的旧数据，避免残留
			currentTasks.forEach(task => { this[task.key] = [] });
			
			try {
				// 3. 逐个请求当前tab的接口，保留100ms延迟，降低服务端压力
				for (let i = 0; i < currentTasks.length; i++) {
					const task = currentTasks[i];
					const res = await this.fetchDataPromise(task.name);
					if (res) {
						this[task.key] = this.transformToKvArray(res, task.name);
					}
					if (i < currentTasks.length - 1) await this.sleep(500);
				}
			} catch (err) {
				console.error('加载数据失败：', err);
			} finally {
				// 4. 请求完成，解锁+关闭加载状态
				this.isLoading = false;
				this.requestLock = false;
			}
		},

		/**
		 * 核心转换逻辑：加入 i18n 汉化支持 (原代码不变，完美保留)
		 */
		transformToKvArray(res, type) {
			if (!res.data || !res.data.result || !res.data.result[1]) return []
			const rawData = res.data.result[1]
			
			let sourceData = rawData[type] || rawData['modem_info'] || rawData['network_info'] || rawData['sim_info'] || rawData['cell_info'] || rawData

			const processItem = (label, value) => {
				const i18nKey = `cellular.fields.${label}`;
				const translatedLabel = this.$te(i18nKey) ? this.$t(i18nKey) : this.formatLabel(label);
				
				return {
					label: translatedLabel,
					value: (value !== undefined && value !== null && value !== '') ? value : '--'
				};
			};

			if (Array.isArray(sourceData)) {
				return sourceData.map(item => processItem(item.full_name || item.key || 'Unknown', item.value))
								 .filter(item => item.label !== 'Unknown');
			}

			if (typeof sourceData === 'object' && sourceData !== null) {
				return Object.keys(sourceData).map(key => processItem(key, sourceData[key]));
			}
			return []
		},

		formatLabel(key) {
			if (!key) return ''
			return key.toString().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
		}
	}
}
</script>

<style scoped>
@import '@/styles/common.scss';
.container { padding: 20rpx; }
.iface-card, .dev-card {
	background: rgba(255, 255, 255, 0.95);
	border-radius: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
	padding: 40rpx;
}
.iface-header, .dev-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.iface-title, .dev-title { font-size: 32rpx; font-weight: bold; color: #333; }
.iface-proto { font-size: 24rpx; color: #6572CC; font-weight: 500; background: #e0e7ff; border-radius: 12rpx; padding: 6rpx 16rpx; }
.iface-protoh { font-size: 48rpx; color: #6572CC; font-weight: 500; background: #e0e7ff; border-radius: 12rpx; padding: 6rpx 16rpx; }
.iface-row, .dev-row { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid rgba(0, 0, 0, 0.05); }
.iface-row:last-child, .dev-row:last-child { border-bottom: none; }
.label { font-size: 26rpx; color: #666; font-weight: 500; flex-shrink: 0; max-width: 45%; }
.value { font-size: 26rpx; font-weight: bold; color: #333; text-align: right; flex: 1; word-break: break-all; padding-left: 20rpx; }
.wireless-empty { color: #999; text-align: center; margin-top: 60rpx; font-size: 28rpx; padding: 40rpx; }
/* 给tabbar增加选中样式，原代码缺失，补充上
.tab-bar{display: flex;justify-content: space-around;margin:20rpx 0;background:rgba(255,255,255,0.95);border-radius:20rpx;padding:10rpx 0;}
.tab{padding:15rpx 0;font-size:28rpx;color:#666;width:100%;text-align:center;}
.tab.active{color:#6572CC;font-weight:bold;border-bottom:4rpx solid #6572CC;}
 */
</style>