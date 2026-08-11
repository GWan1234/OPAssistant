<template>
	<view class="container">
		<oa-page-tab :tabs="tabList" v-model="currentTab" />

		<scroll-view scroll-y="true" class="scroll-area">
			<!-- ===== 模块切换器（所有标签页公共，多模组时显示） ===== -->
			<view class="modem-switcher" v-if="modemList.length > 1">
				<view
					v-for="modem in modemList"
					:key="modem.section"
					:class="['modem-switcher-item', { active: selectedModem === modem.section }]"
					@click="switchModem(modem.section)"
				>
					{{ modem.displayName }}
				</view>
			</view>

			<!-- ========== Tab 0: CPE信息 ========== -->
			<view v-if="currentTab === 0">
				<oa-empty v-if="isLoading" :text="$t('cellular.loading')" />
				<oa-empty v-else-if="modemInfoList.length === 0 && cellInfoList.length === 0 && neighborCellList.length === 0" :text="$t('cellular.no_data')" />
				<view v-else>
					<!-- Modem 信息卡片 -->
					<oa-card v-if="modemInfoList.length > 0" padding="lg">
						<view class="iface-header center-icon">
							<view class="operator-wrapper">
								<!-- 带宽 + 配置节/型号 -->
								<view class="bandwidth-box">
									<view class="bandwidth-item">
										<text class="bw-label">{{ $t('cellular.config_section') }}</text>
										<text class="bw-value">{{ configSection }}</text>
									</view>
									<view class="bandwidth-item">
										<text class="bw-label">{{ $t('cellular.model')}}</text>
										<text class="bw-value">{{ getModuleModel() }}</text>
									</view>
									<view class="bandwidth-item">
										<text class="bw-label">{{ $t('cellular.subscribed_data_rate') }}</text>
										<text class="bw-value">{{ getBandwidth('up') }} | {{ getBandwidth('down') }}</text>
									</view>
								</view>

								<!-- 运营商图标 -->
								<image class="disk-icon" :src="getOperatorImage(operatorInfoList)" mode="widthFix" style="width: 220rpx; height: 220rpx;" />

								<!-- IP地址 + 温度/电压 -->
								<view class="module-info-box">
									<!-- IPv4 地址 -->
									<view class="module-info-item">
										<text class="module-label">IPv4</text>
										<text class="module-value">{{ ipv4Address || '--' }}</text>
									</view>
									<!-- IPv6 地址 -->
									<view class="module-info-item">
										<text class="module-label">IPv6</text>
										<text class="module-value">{{ ipv6Address || '--' }}</text>
									</view>
									<!-- 温度 -->
									<view class="module-info-item">
										<text class="module-label">{{ $t('cellular.temperature') }}</text>
										<text class="module-value">{{ getModuleInfo('temp') }}</text>
									</view>
									<!-- 电压 -->
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
					<!-- SIM 卡状态 - 始终显示卡片，即使无数据也显示占位 -->
					<oa-card v-if="true" padding="lg">
						<view class="iface-header">
							<view class="iface-title">{{ $t('cellular.sim_card_status') }}</view>
							<view class="iface-proto">{{ $t('cellular.sim') }}</view>
						</view>
						<view class="iface-body">
							<!-- 如果有数据则显示，否则显示一条占位 -->
							<template v-if="simInfoList.length > 0">
								<view class="client-row" v-for="(item, index) in simInfoList" :key="'sim-'+index">
									<text class="label">{{ item.label }}：</text>
									<oa-copy-text class="value" :text="item.value">{{ item.value }}</oa-copy-text>
								</view>
							</template>
							<template v-else>
								<view class="client-row">
									<text class="label">{{ $t('cellular.sim_status') }}：</text>
									<text class="value">--</text>
								</view>
							</template>
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
			url: '',
			deviceInfo: {},
			modemList: [],
			selectedModem: '',
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
			requestLock: false,
			ipv4Address: '',
			ipv6Address: ''
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
		configSection() {
			return this.selectedModem || '1_1_4'
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
		this.statusBarHeight = uni.getSystemInfoSync().statusBarHeight;
		uni.setNavigationBarTitle({ title: this.$t('cellular.title') })
		this.deviceInfo = DeviceManager.getCurrentDevice()
		if (!this.deviceInfo || !this.deviceInfo.ip || !this.deviceInfo.port) {
			console.error('[onLoad] 设备信息不完整，跳转到设备列表');
			uni.reLaunch({ url: '/pages/device_list' });
			return;
		}
		this.session = this.deviceInfo.sysauth
		const protocol = this.deviceInfo.useHttps ? 'https' : 'http'
		const formattedHost = DeviceManager.formatHostForUrl(this.deviceInfo.ip)
		this.url = `${protocol}://${formattedHost}:${this.deviceInfo.port}/ubus`
		console.log('[onLoad] url:', this.url);

		await this.loadModemList();
		if (this.modemList.length > 0) {
			this.selectedModem = this.modemList[0].section;
		} else {
			this.selectedModem = '1_1_4';
		}
		this.configLoaded = true;
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
		},
		selectedModem(newVal, oldVal) {
			if (newVal !== oldVal && this.configLoaded) {
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

		// ===== 获取所有 modem-device 列表 =====
		async loadModemList() {
			if (!this.url) {
				console.error('[loadModemList] url 未初始化');
				return;
			}
			try {
				const data = await this.ubusCall('uci', 'get', { config: 'qmodem', type: 'modem-device' });
				console.log('[ModemList] UCI get 返回:', JSON.stringify(data));
				let modemDevices = null;
				if (data && data.values) {
					modemDevices = data.values;
				} else if (data && data['modem-device']) {
					modemDevices = data['modem-device'];
				} else if (data && typeof data === 'object') {
					modemDevices = data;
				}
				if (modemDevices && typeof modemDevices === 'object') {
					const sections = Object.keys(modemDevices).filter(k => !k.startsWith('.'));
					if (sections.length > 0) {
						this.modemList = sections.map(section => {
							const cfg = modemDevices[section];
							const name = cfg && cfg.name ? cfg.name : section;
							return {
								section: section,
								name: name,
								displayName: `${section} (${name})`
							};
						});
						console.log('[ModemList] 获取到模块列表:', this.modemList);
						return;
					}
				}
				// Fallback: 从 network.interface dump 推断
				console.warn('[ModemList] UCI 未获取到模块列表，尝试从 dump 推断');
				const dumpData = await this.ubusCall('network.interface', 'dump', {});
				if (dumpData && dumpData.interface) {
					const candidates = dumpData.interface
						.filter(i => !i.interface.endsWith('v6') && !['wan', 'lan', 'loopback'].includes(i.interface) && /[0-9_]/.test(i.interface))
						.map(i => i.interface);
					if (candidates.length > 0) {
						this.modemList = candidates.map(section => ({
							section: section,
							name: section,
							displayName: section
						}));
						console.log('[ModemList] 从 dump 推断模块列表:', this.modemList);
						return;
					}
				}
				console.warn('[ModemList] 未获取到任何模块，使用默认 1_1_4');
				this.modemList = [{ section: '1_1_4', name: 'Default', displayName: '1_1_4 (Default)' }];
			} catch (e) {
				console.error('[ModemList] 获取失败:', e);
				this.modemList = [{ section: '1_1_4', name: 'Default', displayName: '1_1_4 (Default)' }];
			}
		},

		// ===== 切换模块 =====
		switchModem(section) {
			if (section !== this.selectedModem) {
				this.selectedModem = section;
			}
		},

		// ===== 通用 ubus 调用（动态 config_section） =====
		fetchDataPromise(methodName, params = {}) {
			if (!this.url) {
				console.error('[fetchDataPromise] url 为空');
				return Promise.resolve(null);
			}
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

		// ===== 通用 ubus 调用（任意对象） =====
		ubusCall(object, method, params = {}) {
			if (!this.url) {
				console.error('[ubusCall] url 为空');
				return Promise.resolve(null);
			}
			return new Promise((resolve) => {
				uni.request({
					method: 'POST',
					url: this.url,
					data: {
						jsonrpc: '2.0',
						id: 1,
						method: 'call',
						params: [this.session, object, method, params]
					},
					header: { 'Content-Type': 'application/json' },
					timeout: 8000,
					success: (res) => {
						if (res.data && res.data.result && Array.isArray(res.data.result)) {
							const [code, data] = res.data.result;
							if (code === 0) {
								resolve(data);
							} else {
								console.error(`[ubusCall] 调用失败，错误码: ${code}, 数据:`, data);
								resolve(null);
							}
						} else {
							console.error('[ubusCall] 响应格式异常:', res.data);
							resolve(null);
						}
					},
					fail: (err) => {
						console.error('[ubusCall] 请求失败:', err);
						resolve(null);
					}
				});
			});
		},

		// ===== 获取 IPv4/IPv6 地址 =====
		async fetchIpAddresses() {
			if (!this.url) {
				console.warn('[IP] url 为空，无法获取地址');
				return;
			}
			try {
				const data = await this.ubusCall('network.interface', 'dump', {});
				if (!data || !data.interface) {
					console.warn('[IP] dump 返回无 interface 数据');
					return;
				}
				const interfaces = data.interface;
				const targetIface = interfaces.find(iface => iface.interface === this.configSection);
				const targetIfaceV6 = interfaces.find(iface => iface.interface === this.configSection + 'v6');
				const fallbackIface = interfaces.find(iface => iface.interface === 'wan');
				const fallbackIfaceV6 = interfaces.find(iface => iface.interface === 'wan6');

				const ipv4Iface = targetIface || fallbackIface;
				const ipv6Iface = targetIfaceV6 || fallbackIfaceV6;

				if (ipv4Iface && ipv4Iface['ipv4-address'] && ipv4Iface['ipv4-address'].length > 0) {
					this.ipv4Address = ipv4Iface['ipv4-address'][0].address;
				} else {
					this.ipv4Address = '';
				}
				if (ipv6Iface && ipv6Iface['ipv6-address'] && ipv6Iface['ipv6-address'].length > 0) {
					this.ipv6Address = ipv6Iface['ipv6-address'][0].address;
				} else {
					this.ipv6Address = '';
				}
				console.log('[IP] 最终地址:', this.ipv4Address, this.ipv6Address);
			} catch (e) {
				console.warn('[IP] 获取失败:', e);
				this.ipv4Address = '';
				this.ipv6Address = '';
			}
		},

		// ===== 读取文件（用于历史短信，静默处理文件不存在错误） =====
		fetchFileReadPromise(path) {
			if (!this.url) {
				console.error('[fetchFileReadPromise] url 为空');
				return Promise.resolve(null);
			}
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
					success: (res) => {
						if (res.data && res.data.result && Array.isArray(res.data.result)) {
							const [code, data] = res.data.result;
							if (code === 0) {
								resolve(data);
							} else {
								// 错误码6表示文件不存在，静默处理，不打印错误
								if (code !== 6) {
									console.error(`[file.read] 错误码: ${code}, 信息:`, data);
								}
								resolve(null);
							}
						} else {
							console.error('[file.read] 响应格式异常:', res.data);
							resolve(null);
						}
					},
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
			currentTasks.forEach(task => {
				if (task.key === 'lockBandData') {
					this.lockBandData = { availableBandList: [], lockBandList: [] };
				} else {
					this[task.key] = [];
				}
			});

			try {
				if (currentTab === 3) {
					// 短信
					const smsRes = await this.fetchDataPromise('get_sms');
					let realtimeSms = [];
					if (smsRes && smsRes.data && smsRes.data.result) {
						realtimeSms = smsRes.data.result[1]?.msg || [];
					}
					let historySms = [];
					const historyPath = `/etc/qmodem/${this.configSection}_received.json`;
					const fileRes = await this.fetchFileReadPromise(historyPath);
					if (fileRes && fileRes.data) {
						try {
							const parsed = JSON.parse(fileRes.data);
							historySms = parsed.received || [];
						} catch (e) {
							console.error('解析历史短信JSON失败:', e);
						}
					}
					const merged = this.mergeSmsLists(realtimeSms, historySms);
					this.smsList = merged;
				} else {
					for (let i = 0; i < currentTasks.length; i++) {
						const task = currentTasks[i];
						try {
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
							} else {
								// 若请求失败，保留空数组
								console.warn(`[loadCurrentTabData] 任务 ${task.name} 返回空结果`);
							}
						} catch (e) {
							console.error(`[loadCurrentTabData] 任务 ${task.name} 执行异常:`, e);
						}
						if (i < currentTasks.length - 1) await this.sleep(1);
					}
					if (currentTab === 0) {
						await this.fetchIpAddresses();
					}
				}
			} catch (err) {
				console.error('加载数据失败：', err);
			} finally {
				this.isLoading = false;
				this.requestLock = false;
			}
		},

		// ===== 合并短信列表 =====
		mergeSmsLists(realtime, history) {
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

			const result = [...single, ...merged];
			result.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
			return result;
		},

		// ===== 数据转换 =====
		transformToKvArray(res, type) {
			try {
				if (!res.data || !res.data.result || !res.data.result[1]) {
					console.warn(`[transformToKvArray] 响应缺少 result[1] for type ${type}`);
					return [];
				}
				const rawData = res.data.result[1]
				let sourceData = rawData[type] || rawData['modem_info'] || rawData['network_info'] || rawData['sim_info'] || rawData['cell_info'] || rawData
				if (!sourceData) {
					console.warn(`[transformToKvArray] 未找到数据源 for type ${type}`);
					return [];
				}

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

		formatTimestamp(ts) {
			if (!ts) return '--'
			const date = new Date(ts * 1000)
			if (isNaN(date.getTime())) return '--'
			const pad = (n) => String(n).padStart(2, '0')
			return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
		},

		getBandNameById(id) {
			const band = this.lockBandData.availableBandList.find(b => b.band_id === id)
			return band ? band.band_name : id
		},

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

		getModuleModel() {
			const sources = [
				...(this.baseInfoList || []),
				...(this.modemInfoList || []),
				...(this.cellInfoList || [])
			];
			const targetKeys = ['model', 'name', 'module_name', 'product', 'model_name'];
			for (let item of sources) {
				if (!item || !item.rawKey) continue;
				const key = String(item.rawKey).toLowerCase().replace(/[\s_]/g, '');
				if (targetKeys.some(t => key === t || key.includes(t))) {
					const val = item.value;
					if (val && val !== '--') return val;
				}
			}
			for (let item of sources) {
				if (!item || !item.fullName) continue;
				const name = String(item.fullName).toLowerCase();
				if (name.includes('model') || name.includes('name')) {
					const val = item.value;
					if (val && val !== '--') return val;
				}
			}
			return '--';
		},

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
	gap: 6rpx;
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
	gap: 8rpx;
	align-items: flex-end;
	max-width: 40%;
}
.module-info-item {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	width: 100%;
}
.module-label {
	font-size: 22rpx;
	color: $oa-text-muted;
}
.module-value {
	font-size: 24rpx;
	font-weight: bold;
	color: #6572CC;
	word-break: break-all;
	text-align: right;
	width: 100%;
}

/* ===== 模块切换器样式 ===== */
.modem-switcher {
	display: flex;
	justify-content: center;
	gap: 16rpx;
	margin-bottom: 20rpx;
	padding: 12rpx 0;
	background: $oa-surface-sunken;
	border-radius: $oa-radius-lg;
}
.modem-switcher-item {
	padding: 10rpx 32rpx;
	border-radius: $oa-radius-full;
	font-size: 28rpx;
	font-weight: 500;
	color: $oa-text-muted;
	background: transparent;
	transition: all 0.25s ease;
	cursor: pointer;
}
.modem-switcher-item.active {
	color: #fff;
	background: #6572CC;
	box-shadow: 0 4rpx 12rpx rgba(101, 114, 204, 0.35);
}
.modem-switcher-item:active {
	transform: scale(0.96);
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