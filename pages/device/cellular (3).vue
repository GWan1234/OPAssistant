<template>
	<view class="container">
		<view class="header" :style="{ height: statusBarHeight + 'px' }"></view>
		<oa-page-tab :tabs="tabList" v-model="currentTab" />

		<scroll-view scroll-y="true" class="scroll-area">
			<!-- ========== Tab 0: CPE信息 ========== -->
			<view v-if="currentTab === 0">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="modemInfoList.length === 0 && cellInfoList.length === 0 && neighborCellList.length === 0" :text="$t('cellular.no_data')" />
				<view v-else>
					<!-- Modem 信息卡片 -->
					<oa-card v-if="modemInfoList.length > 0" padding="lg">
						<view class="iface-header center-icon">
							<view class="operator-wrapper">
								<!-- 带宽 -->
                                <view class="bandwidth-box">
                                	<!-- 显示当前模块的配置节名称 -->
                                	<view class="bandwidth-item" style="margin-bottom: 4rpx;">
                                		<text class="bw-label" style="font-size: 20rpx; color: #999;">{{ $t('cellular.config_section') || 'Modem' }}</text>
                                		<text class="bw-value" style="font-size: 24rpx; color: #888;">{{ configSection }}</text>
                                	</view>
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

					<!-- Cell 信息卡片 -->
					<oa-card v-if="cellInfoList.length > 0" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.cell') }}</view>
							<view class="iface-proto">{{ $t('cellular.cell') }}</view>
						</view>
						<view class="iface-body">
							<view class="client-row" v-for="(item, index) in cellInfoList" :key="'cell-'+index">
								<text class="label">{{ item.label }}：</text>
								<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
							</view>
						</view>
					</oa-card>

					<!-- 邻区信息卡片 -->
					<oa-card v-if="neighborCellList.length > 0" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.neighbor_cell') }}</view>
							<view class="iface-proto">LTE</view>
						</view>
						<view class="neighbor-table">
							<view class="neighbor-header">
								<text class="col arfcn">ARFCN</text>
								<text class="col pci">PCI</text>
								<text class="col rsrp">RSRP</text>
								<text class="col rsrq">RSRQ</text>
							</view>
							<view class="neighbor-row" v-for="(cell, idx) in neighborCellList" :key="idx">
								<text class="col arfcn">{{ cell.arfcn || '--' }}</text>
								<text class="col pci">{{ cell.pci || '--' }}</text>
								<text class="col rsrp">{{ cell.rsrp || '--' }}</text>
								<text class="col rsrq">{{ cell.rsrq || '--' }}</text>
							</view>
						</view>
						<view v-if="neighborLockStatus" class="lock-status">
							<text>{{ $t('cellular.lock_status') }}：{{ neighborLockStatus }}</text>
						</view>
					</oa-card>
				</view>
			</view>

			<!-- ========== Tab 1: 硬件信息 ========== -->
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

			<!-- ========== Tab 2: 网络设置 ========== -->
			<view v-else-if="currentTab === 2">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="simInfoList.length === 0 && netInfoList.length === 0 && !lockBandData.availableBandList.length && !lockBandData.lockBandList.length" :text="$t('cellular.no_data')" />
				<view v-else>
					<!-- SIM 卡状态 -->
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

					<!-- 网络设置 -->
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

					<!-- 锁频段卡片 -->
					<oa-card v-if="lockBandData.availableBandList.length || lockBandData.lockBandList.length" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.band_lock') }}</view>
							<view class="iface-proto">LTE</view>
						</view>
						<view class="band-section">
							<text class="band-title">{{ $t('cellular.available_bands') }}</text>
							<view class="band-tags">
								<view class="tag available" v-for="band in lockBandData.availableBandList" :key="band.band_id">
									{{ band.band_name }}
								</view>
							</view>
						</view>
						<view class="band-section">
							<text class="band-title">{{ $t('cellular.locked_bands') }}</text>
							<view class="band-tags">
								<view class="tag locked" v-for="bandId in lockBandData.lockBandList" :key="bandId">
									{{ getBandNameById(bandId) || bandId }}
								</view>
							</view>
						</view>
					</oa-card>
				</view>
			</view>

			<!-- ========== Tab 3: 短信（含历史） ========== -->
			<view v-else-if="currentTab === 3">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="smsList.length === 0" :text="$t('cellular.no_data')" />
				<view v-else>
					<oa-card padding="lg" v-for="(sms, idx) in smsList" :key="sms.id || idx">
						<view class="sms-item">
							<view class="sms-header">
								<view class="sms-sender-wrapper">
									<text class="sms-sender">📩 {{ sms.sender }}</text>
									<!-- 未读标记 -->
									<text v-if="sms.is_read === false" class="sms-unread">{{ $t('cellular.unread') }}</text>
								</view>
								<text class="sms-time">{{ formatTimestamp(sms.timestamp) }}</text>
							</view>
							<view class="sms-content">{{ sms.content || '--' }}</view>
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
			configSection: '2_2_8',        // 动态获取后覆盖
			configLoaded: false,
			modemInfoList: [],
			cellInfoList: [],
			baseInfoList: [],
			netInfoList: [],
			simInfoList: [],
			smsList: [],
			neighborCellList: [],
			neighborLockStatus: '',
			lockBandData: {
				availableBandList: [],
				lockBandList: []
			},
			isLoading: false,
			requestLock: false
		}
	},
	computed: {
		tabList() {
			return [
				{ value: 0, label: this.$t('cellular.CPEinfo') },
				{ value: 1, label: this.$t('cellular.CPEhardware') },
				{ value: 2, label: this.$t('cellular.CPEsetting') },
				{ value: 3, label: this.$t('cellular.sms') }
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
	async onLoad() {
		// 修复状态栏高度：数字 + 'px'
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight;
		uni.setNavigationBarTitle({ title: this.$t('cellular.title') })
		this.deviceInfo = DeviceManager.getCurrentDevice()
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`

		// 先读取配置节名，再加载数据
		await this.loadConfigSection();
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

		// ===== 从 /etc/config/qmodem 提取 config_section =====
		async loadConfigSection() {
			try {
				const res = await this.fetchFileReadPromise('/etc/config/qmodem');
				if (res && res.data && res.data.result) {
					const rawData = res.data.result[1]?.data || '';
					const match = rawData.match(/config\s+modem-device\s+'([^']+)'/);
					if (match && match[1]) {
						this.configSection = match[1];
						console.log('[Config] 获取到 config_section:', this.configSection);
					} else {
						console.warn('[Config] 未找到 modem-device，使用默认值 1_1_4');
					}
				}
			} catch (e) {
				console.error('[Config] 读取配置文件失败:', e);
			}
			this.configLoaded = true;
		},

		// ===== 通用 ubus 调用（动态 config_section） =====
		fetchDataPromise(methodName, params = {}) {
			const finalParams = { config_section: this.configSection, ...params };
			return new Promise((resolve) => {
				uni.request({
					method: 'POST',
					url: this.url,
					data: {
						jsonrpc: '2.0', id: 1, method: 'call',
						params: [this.session, 'qmodem', methodName, finalParams]
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

		// ===== 读取文件 =====
		fetchFileReadPromise(path) {
			return new Promise((resolve) => {
				uni.request({
					method: 'POST',
					url: this.url,
					data: {
						jsonrpc: '2.0', id: 1, method: 'call',
						params: [this.session, 'file', 'read', { path }]
					},
					header: { 'Content-Type': 'application/json' },
					timeout: 8000,
					success: (res) => resolve(res),
					fail: (err) => { 
						console.error('文件读取失败:', err);
						resolve(null); 
					}
				});
			});
		},

		getApiListByTab(tabIndex) {
			switch(tabIndex) {
				case 0: return [
					{ name: 'info', key: 'modemInfoList' },
					{ name: 'cell_info', key: 'cellInfoList' },
					{ name: 'get_neighborcell', key: 'neighborCellList' }
				];
				case 1: return [{ name: 'base_info', key: 'baseInfoList' }];
				case 2: return [
					{ name: 'sim_info', key: 'simInfoList' },
					{ name: 'network_info', key: 'netInfoList' },
					{ name: 'get_lockband', key: 'lockBandData' }
				];
				case 3: return [{ name: 'get_sms', key: 'smsList' }];
				default: return [];
			}
		},

		async loadCurrentTabData() {
			if (this.requestLock) return;
			this.requestLock = true;
			this.isLoading = true;

			const currentTab = this.currentTab;
			const currentTasks = this.getApiListByTab(currentTab);
			// 重置数据
			currentTasks.forEach(task => {
				if (task.key === 'lockBandData') {
					this.lockBandData = { availableBandList: [], lockBandList: [] };
				} else {
					this[task.key] = [];
				}
			});

			try {
				// ===== 短信 Tab 特殊处理：合并历史短信 =====
				if (currentTab === 3) {
					// 1. 获取实时短信
					const smsRes = await this.fetchDataPromise('get_sms');
					let realtimeSms = [];
					if (smsRes && smsRes.data && smsRes.data.result) {
						realtimeSms = smsRes.data.result[1]?.msg || [];
					}
					// 2. 读取历史短信文件（路径动态拼接 configSection）
					let historySms = [];
					const historyPath = `/etc/qmodem/${this.configSection}_received.json`;
					const fileRes = await this.fetchFileReadPromise(historyPath);
					if (fileRes && fileRes.data && fileRes.data.result) {
						const rawData = fileRes.data.result[1];
						if (rawData && rawData.data) {
							try {
								const parsed = JSON.parse(rawData.data);
								historySms = parsed.received || [];
							} catch (e) {
								console.error('解析历史短信JSON失败:', e);
							}
						}
					}
					// 3. 合并去重并排序（含长短信拼接）
					const merged = this.mergeSmsLists(realtimeSms, historySms);
					this.smsList = merged;
				} else {
					// 其他 tab 正常处理
					for (let i = 0; i < currentTasks.length; i++) {
						const task = currentTasks[i];
						const res = await this.fetchDataPromise(task.name);
						if (res && res.data && res.data.result) {
							if (task.name === 'get_neighborcell') {
								const neighborData = res.data.result[1]?.neighborcell || {};
								this.neighborCellList = neighborData.LTE || [];
								this.neighborLockStatus = neighborData.lockcell_status?.lockcell_status || '';
							} else if (task.name === 'get_lockband') {
								const lteData = res.data.result[1]?.lockband?.Lte || {};
								this.lockBandData.availableBandList = lteData.available_band || [];
								this.lockBandData.lockBandList = lteData.lock_band || [];
							} else {
								this[task.key] = this.transformToKvArray(res, task.name);
							}
						}
						if (i < currentTasks.length - 1) await this.sleep(1);
					}
				}
			} catch (err) {
				console.error('加载数据失败：', err);
			} finally {
				this.isLoading = false;
				this.requestLock = false;
			}
		},

		// ===== 合并短信列表（去重 + 排序 + 长短信拼接） =====
		mergeSmsLists(realtime, history) {
			// 1. 合并去重（基于 id，若无则用 sender+timestamp）
			const map = new Map();
			const all = [...history, ...realtime];
			all.forEach(item => {
				const id = item.id !== undefined ? item.id : `${item.sender}_${item.timestamp || Date.now()}`;
				if (map.has(id)) {
					map.set(id, { ...map.get(id), ...item });
				} else {
					map.set(id, { ...item, id });
				}
			});
			let smsList = Array.from(map.values());

			// 2. 分离长短信片段和普通短信
			const groups = new Map();
			const single = [];
			smsList.forEach(sms => {
				if (sms.reference && sms.total && sms.total > 1 && sms.part !== undefined) {
					const ref = sms.reference;
					if (!groups.has(ref)) {
						groups.set(ref, {
							parts: [],
							sender: sms.sender,
							timestamp: sms.timestamp,
							total: sms.total,
							is_read: sms.is_read,
							original_reference: sms.original_reference
						});
					}
					const group = groups.get(ref);
					group.parts.push(sms);
					if (!sms.is_read) group.is_read = false;
				} else {
					single.push(sms);
				}
			});

			// 3. 拼接每组片段
			const merged = [];
			for (const [ref, group] of groups) {
				group.parts.sort((a, b) => a.part - b.part);
				const content = group.parts.map(p => p.content || '').join('');
				merged.push({
					id: `ref_${ref}`,
					sender: group.sender,
					timestamp: group.timestamp,
					content: content,
					is_read: group.is_read,
					reference: ref,
					total: group.total,
					parts: group.parts.map(p => p.part)
				});
			}

			// 4. 合并并按时间降序排列
			const result = [...single, ...merged];
			result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
			return result;
		},

		// ===== 数据转换 =====
		transformToKvArray(res, type) {
			try {
				if (!res.data || !res.data.result || !res.data.result[1]) return []
				const rawData = res.data.result[1]
				let sourceData = rawData[type] || rawData['modem_info'] || rawData['network_info'] || rawData['sim_info'] || rawData['cell_info'] || rawData

				if (!sourceData) return []

				const processItem = (item) => {
					if (!item) return null
					let key = item.key || ''
					let fullName = item.full_name || ''
					let value = item.value

					if (!key && fullName) key = fullName
					if (!key && !fullName) return null

					let label = null
					if (fullName) {
						const i18nKey = `cellular.fields.${fullName}`
						if (this.$te(i18nKey)) label = this.$t(i18nKey)
					}
					if (!label && key) {
						const i18nKey = `cellular.fields.${key}`
						if (this.$te(i18nKey)) label = this.$t(i18nKey)
					}
					if (!label) {
						label = fullName || this.formatLabel(key)
					}

					return {
						rawKey: key,
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

		// ===== 时间格式化 =====
		formatTimestamp(ts) {
			if (!ts) return '--'
			const date = new Date(ts * 1000)
			if (isNaN(date.getTime())) return '--'
			const pad = (n) => String(n).padStart(2, '0')
			return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
		},

		// ===== 根据 band_id 获取 band_name =====
		getBandNameById(id) {
			const band = this.lockBandData.availableBandList.find(b => b.band_id === id)
			return band ? band.band_name : id
		},

		// ===== 运营商相关 =====
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

				if (lowerKey === 'mcc' || lowerKey === 'home_mcc' || lowerKey.includes('mcc')) {
					mcc = value
				}
				if (lowerKey === 'mnc' || lowerKey === 'home_mnc' || lowerKey.includes('mnc')) {
					mnc = value
				}

				if ((lowerKey.includes('plmn') || lowerKey.includes('operator')) && /^\d{5,6}$/.test(value)) {
					mcc = value.substring(0, 3)
					mnc = value.substring(3)
				}

				if ((!mcc || !mnc) && /^\d{5,6}$/.test(value)) {
					mcc = value.substring(0, 3)
					mnc = value.substring(3)
				}

				if (mcc && mnc) break
			}
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

		// ===== 带宽 =====
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

		// ===== 温度/电压 =====
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
	display: flex;
	flex-direction: column;
	height: 100vh;
	box-sizing: border-box;
}
.header { 
	background: transparent; 
	flex-shrink: 0;
}
oa-page-tab {
	flex-shrink: 0;
}
.scroll-area {
	flex: 1;
	height: 0;
	margin-top: 10rpx;
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
	box-sizing: border-box;
}

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

/* ===== 邻区表格样式 ===== */
.neighbor-table {
	margin-top: 10rpx;
	background: #f8f9fc;
	border-radius: 12rpx;
	padding: 12rpx 16rpx;
}
.neighbor-header, .neighbor-row {
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	padding: 8rpx 0;
	border-bottom: 1rpx solid $oa-hairline;
}
.neighbor-header {
	font-weight: bold;
	color: $oa-text-muted;
	font-size: 24rpx;
}
.neighbor-row:last-child {
	border-bottom: none;
}
.col {
	flex: 1;
	text-align: center;
	font-size: 26rpx;
	color: $oa-text;
}
.col.arfcn { flex: 1.2; }
.col.pci { flex: 1; }
.col.rsrp { flex: 1; }
.col.rsrq { flex: 1; }

.lock-status {
	margin-top: 16rpx;
	font-size: 26rpx;
	color: $oa-text-muted;
	text-align: center;
}

/* ===== 锁频段样式 ===== */
.band-section {
	margin-bottom: 24rpx;
}
.band-title {
	display: block;
	font-size: 28rpx;
	font-weight: bold;
	color: $oa-text;
	margin-bottom: 12rpx;
}
.band-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}
.tag {
	padding: 6rpx 20rpx;
	border-radius: 20rpx;
	font-size: 26rpx;
	background: #f0f0f0;
	color: $oa-text;
}
.tag.available {
	background: #e8f5e9;
	color: #2e7d32;
}
.tag.locked {
	background: #ffebee;
	color: #c62828;
}

/* ===== 短信卡片样式 ===== */
.sms-item {
	padding: 10rpx 0;
}
.sms-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 12rpx;
}
.sms-sender-wrapper {
	display: flex;
	align-items: center;
	gap: 12rpx;
}
.sms-sender {
	font-size: 28rpx;
	font-weight: bold;
	color: $oa-text;
}
.sms-unread {
	font-size: 22rpx;
	color: #ff4d4f;
	background: #fff1f0;
	padding: 2rpx 12rpx;
	border-radius: 20rpx;
}
.sms-time {
	font-size: 24rpx;
	color: $oa-text-muted;
}
.sms-content {
	font-size: 28rpx;
	color: $oa-text;
	padding: 10rpx 20rpx;
	background: #f5f7fa;
	border-radius: 12rpx;
	word-break: break-all;
}
</style>