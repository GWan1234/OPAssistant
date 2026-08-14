<template>
	<view class="container">
		<!-- 头部 Tab 切换 -->
		<view class="tab-header">
			<view 
				v-for="(tab, index) in tabs" 
				:key="index" 
				class="tab-item" 
				:class="{ active: currentTab === index }"
				@click="currentTab = index"
			>
				{{ tab }}
			</view>
		</view>

		<view v-if="loading" class="loading-box">
			<text>{{ $t('openclash.loading') }}</text>
		</view>

		<view v-else class="tab-body">
			<!-- Tab 0: 全局状态与运行模式 -->
			<view v-if="currentTab === 0" class="panel">
				<view class="card">
					<view class="card-title">{{ $t('openclash.main_service_status') }}</view>
					<view class="form-item">
						<text class="label">{{ $t('openclash.enable_openclash') }}</text>
						<switch :checked="globalConfig.enable === '1'" @change="onToggleEnable" :disabled="submitting" />
					</view>
				</view>

				<view class="card">
					<view class="card-title">{{ $t('openclash.operation_mode_settings') }}</view>
					
					<view class="form-item">
						<text class="label">{{ $t('openclash.operation_mode') }}</text>
						<picker :value="operationModeIndex" :range="operationModeLabels" @change="onOperationModeChange">
							<view class="picker-value">{{ operationModeLabels[operationModeIndex] }}</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="label">{{ $t('openclash.core_mode') }}</text>
						<picker :value="enModeIndex" :range="enModeLabels" @change="onEnModeChange">
							<view class="picker-value">{{ enModeLabels[enModeIndex] }}</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="label">{{ $t('openclash.dashboard_port') }}</text>
						<input class="input" type="number" v-model="globalConfig.cn_port" :placeholder="$t('openclash.default_port_9090')" />
					</view>

					<button class="btn btn-primary" :loading="submitting" @click="saveGlobalSettings">
						{{ $t('openclash.save_and_reload') }}
					</button>
				</view>

				<!-- OpenClash 实时状态卡片 -->
				<view class="card">
					<view class="card-title">OpenClash 运行状态</view>
					<button class="btn btn-sm btn-primary" :loading="loginHtmlLoading" @click="fetchAllData">
						刷新状态
					</button>

					<view v-if="hasOpenclashStatus" class="status-grid">
						<view class="status-item">
							<text class="status-label">下载总量</text>
							<text class="status-value">{{ openclashStatus.down_total || '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">上传总量</text>
							<text class="status-value">{{ openclashStatus.up_total || '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">当前下载</text>
							<text class="status-value">{{ openclashStatus.down || '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">当前上传</text>
							<text class="status-value">{{ openclashStatus.up || '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">连接数</text>
							<text class="status-value">{{ openclashStatus.connections != null ? openclashStatus.connections : '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">CPU 使用率</text>
							<text class="status-value">{{ openclashStatus.cpu != null ? openclashStatus.cpu + '%' : '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">内存占用</text>
							<text class="status-value">{{ openclashStatus.mem || '--' }}</text>
						</view>
						<view class="status-item">
							<text class="status-label">负载均衡</text>
							<text class="status-value">{{ openclashStatus.load_avg || '--' }}</text>
						</view>
					</view>

					<view v-else class="html-box">
						<text class="html-text">{{ loginHtml || '点击上方按钮获取状态' }}</text>
					</view>
				</view>

				<!-- MyIP 检查信息卡片 -->
				<view class="card">
					<view class="card-title">MyIP 检查信息</view>
					<button class="btn btn-sm btn-primary" :loading="myipLoading" @click="fetchMyIpInfo">
						刷新 MyIP
					</button>

					<view v-if="myipList.length > 0" class="myip-list">
						<view v-for="item in myipList" :key="item.source" class="myip-item">
							<text class="myip-source">{{ item.source }}</text>
							<view class="myip-detail">
								<text class="myip-geo">{{ item.geo || '未知位置' }}</text>
								<text class="myip-ip">{{ item.ip || '未知 IP' }}</text>
							</view>
						</view>
					</view>

					<view v-else class="html-box">
						<text class="html-text">{{ myipRaw || '点击上方按钮获取 MyIP 信息' }}</text>
					</view>
				</view>

				<!-- 当前配置文件卡片 -->
				<view class="card">
					<view class="card-title">当前配置文件</view>
					<view class="config-name-box">
						<text class="config-name-text">{{ configName || '未获取' }}</text>
					</view>
				</view>

				<!-- 订阅信息卡片（新增） -->
				<view class="card">
					<view class="card-title">订阅信息</view>
					<button class="btn btn-sm btn-primary" :loading="subInfoLoading" @click="fetchSubInfo">
						刷新订阅信息
					</button>

					<view v-if="subInfoList.length > 0" class="subinfo-list">
						<view v-for="(item, index) in subInfoList" :key="index" class="subinfo-item">
							<text class="subinfo-label">{{ item.label }}</text>
							<text class="subinfo-value">{{ item.value }}</text>
						</view>
					</view>

					<view v-else class="html-box">
						<text class="html-text">{{ subInfoRaw || '点击上方按钮获取订阅信息' }}</text>
					</view>
				</view>
			</view>

			<!-- Tab 1: 订阅管理 -->
			<view v-if="currentTab === 1" class="panel">
				<view class="sub-header">
					<text class="sub-title">{{ $t('openclash.subscription_list') }}</text>
					<view class="header-btns">
						<button class="btn btn-sm btn-primary" :loading="updatingSub" @click="updateAllSubscribes">
							{{ $t('openclash.update_all_subscriptions') }}
						</button>
						<button class="btn btn-sm btn-success" @click="openSubModal(null)">
							+ {{ $t('openclash.add_subscription') }}
						</button>
					</view>
				</view>

				<view v-if="subscribes.length === 0" class="empty-tip">
					{{ $t('openclash.no_subscription_configured') }}
				</view>

				<view v-for="item in subscribes" :key="item.secName" class="card sub-card">
					<view class="sub-info">
						<view class="sub-name">{{ item.name }}</view>
						<view class="sub-url">{{ item.address }}</view>
					</view>
					<view class="sub-actions">
						<switch :checked="item.enabled" @change="(e) => onToggleSubEnable(item, e)" />
						<button class="btn btn-sm btn-warning" :disabled="updatingSub" @click="updateSubscribe(item)">
							{{ $t('openclash.update') }}
						</button>
						<button class="btn btn-sm btn-outline" @click="openSubModal(item)">
							{{ $t('openclash.edit') }}
						</button>
						<button class="btn btn-sm btn-danger" @click="deleteSub(item)">
							{{ $t('openclash.delete') }}
						</button>
					</view>
				</view>
			</view>

			<!-- Tab 2: 运行日志 -->
			<view v-if="currentTab === 2" class="panel">
				<view class="log-actions">
					<button class="btn btn-sm btn-primary" @click="fetchLogs">
						{{ $t('openclash.refresh_log') }}
					</button>
				</view>
				<scroll-view 
					scroll-y 
					class="log-box" 
					:scroll-top="logScrollTop"
					@scroll="onLogScroll"
				>
					<text class="log-text">{{ logContent }}</text>
					<view id="log-bottom" style="height: 1px;"></view>
				</scroll-view>
			</view>
		</view>

		<!-- 订阅编辑弹窗 -->
		<view v-if="showSubModal" class="modal-mask">
			<view class="modal-body">
				<view class="modal-title">{{ editingSecName ? $t('openclash.edit_subscription') : $t('openclash.add_subscription') }}</view>
				<view class="form-item">
					<text class="label">{{ $t('openclash.subscription_name') }}</text>
					<input class="input" v-model="subForm.name" :placeholder="$t('openclash.subscription_name_placeholder')" />
				</view>
				<view class="form-item">
					<text class="label">{{ $t('openclash.subscription_url') }}</text>
					<input class="input" v-model="subForm.address" :placeholder="$t('openclash.subscription_url_placeholder')" />
				</view>
				<view class="form-item">
					<text class="label">{{ $t('openclash.enable_subconverter') }}</text>
					<switch :checked="subForm.sub_convert === '1'" @change="(e) => subForm.sub_convert = e.detail.value ? '1' : '0'" />
				</view>
				<view class="modal-btns">
					<button class="btn btn-default" @click="showSubModal = false">{{ $t('openclash.cancel') }}</button>
					<button class="btn btn-primary" :loading="submitting" @click="submitSubForm">{{ $t('openclash.save') }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import DeviceManager from '@/utils/device-manager.js'

export default {
	data() {
		return {
			currentTab: 0,
			loading: true,
			submitting: false,
			updatingSub: false,
			
			globalKey: '',
			globalConfig: {},
			subscribes: [],
			logContent: '',
			logScrollTop: 0,

			// OpenClash 状态相关
			loginHtml: '',
			loginHtmlLoading: false,
			openclashStatus: {},

			// MyIP 检查相关
			myipList: [],
			myipRaw: '',
			myipLoading: false,

			// 当前配置文件
			configName: '',

			// 订阅信息相关（新增）
			subInfoList: [],       // 解析后的键值对列表
			subInfoRaw: '',        // 原始文本回退
			subInfoLoading: false, // 加载状态

			operationModes: [
				{ value: 'redir-host' },
				{ value: 'fake-ip' },
				{ value: 'script' }
			],
			operationModeIndex: 0,

			enModes: [
				{ value: 'redir-host' },
				{ value: 'fake-ip' },
				{ value: 'tun' },
				{ value: 'mix' }
			],
			enModeIndex: 0,

			showSubModal: false,
			editingSecName: null,
			subForm: {
				name: '',
				address: '',
				enabled: true,
				sub_convert: '0'
			}
		}
	},
	computed: {
		tabs() {
			return [
				this.$t('openclash.tab_runtime'),
				this.$t('openclash.tab_subscription'),
				this.$t('openclash.tab_log')
			]
		},
		operationModeLabels() {
			return this.operationModes.map(m => this.$t(`openclash.mode_${m.value}`))
		},
		enModeLabels() {
			return this.enModes.map(m => this.$t(`openclash.core_${m.value}`))
		},
		hasOpenclashStatus() {
			return this.openclashStatus && Object.keys(this.openclashStatus).length > 0
		}
	},
	mounted() {
		this.loadData()
		this.fetchAllData()
	},
	watch: {
		currentTab(val) {
			if (val === 2) {
				this.fetchLogs()
			}
		}
	},
	methods: {
		async loadData() {
			this.loading = true
			try {
				const data = await UciRpc.get('openclash') || {}
				
				let gKey = Object.keys(data).find(k => data[k] && data[k]['.type'] === 'openclash')
				if (!gKey) {
					gKey = 'config'
				}
				this.globalKey = gKey
				this.globalConfig = data[gKey] || {}

				this.subscribes = Object.keys(data)
					.filter(k => data[k] && data[k]['.type'] === 'config_subscribe')
					.map(k => ({
						secName: k,
						name: data[k].name || this.$t('openclash.unnamed_subscription'),
						address: data[k].address || '',
						enabled: data[k].enabled === '1',
						sub_convert: data[k].sub_convert || '0',
						auto_update: data[k].auto_update === '1',
						...data[k]
					}))

				const opIdx = this.operationModes.findIndex(m => m.value === this.globalConfig.operation_mode)
				this.operationModeIndex = opIdx !== -1 ? opIdx : 0

				const enIdx = this.enModes.findIndex(m => m.value === this.globalConfig.en_mode)
				this.enModeIndex = enIdx !== -1 ? enIdx : 0
			} catch (err) {
				uni.showToast({ title: this.$t('openclash.load_failed'), icon: 'none' })
			} finally {
				this.loading = false
			}
		},

		async fetchAllData() {
			this.loginHtmlLoading = true
			this.myipLoading = true
			this.subInfoLoading = true  // 同时加载订阅信息
			try {
				const device = DeviceManager.getCurrentDevice()
				if (!device || !device.username || !device.password) {
					throw new Error('设备信息不完整')
				}

				const username = device.username
				const password = encodeURIComponent(device.password)

				const baseUrl = 'http://127.0.0.1/cgi-bin/luci'
				const cookieFile = '/tmp/luci-cookie'

				// 登录 LuCI
				const loginParams = [
					'-s', '-L',
					'-c', cookieFile,
					'-d', `luci_username=${username}`,
					'-d', `luci_password=${password}`,
					baseUrl
				]
				await UciRpc.callUbus('file', 'exec', {
					command: 'curl',
					params: loginParams
				}, 15000)

				// 抓取 toolbar_show 页面
				const toolbarOutput = '/tmp/openclash.html'
				const toolbarUrl = `${baseUrl}/admin/services/openclash/toolbar_show`
				await UciRpc.callUbus('file', 'exec', {
					command: 'curl',
					params: ['-s', '-L', '-b', cookieFile, toolbarUrl, '-o', toolbarOutput]
				}, 15000)

				// 抓取 myip_check 页面
				const myipOutput = '/tmp/myip_check.html'
				const myipUrl = `${baseUrl}/admin/services/openclash/myip_check`
				await UciRpc.callUbus('file', 'exec', {
					command: 'curl',
					params: ['-s', '-L', '-b', cookieFile, myipUrl, '-o', myipOutput]
				}, 15000)

				// 抓取 config_name 页面
				const configOutput = '/tmp/config_name.html'
				const configUrl = `${baseUrl}/admin/services/openclash/config_name`
				await UciRpc.callUbus('file', 'exec', {
					command: 'curl',
					params: ['-s', '-L', '-b', cookieFile, configUrl, '-o', configOutput]
				}, 15000)

				// 读取并解析 toolbar_show
				const toolbarRaw = await UciRpc.readFile(toolbarOutput)
				try {
					this.openclashStatus = JSON.parse(toolbarRaw)
					this.loginHtml = ''
				} catch (e) {
					this.openclashStatus = {}
					this.loginHtml = toolbarRaw || '页面返回内容为空'
				}

				// 读取并解析 myip_check
				const myipRawText = await UciRpc.readFile(myipOutput)
				this.myipRaw = myipRawText || ''
				try {
					const myipData = JSON.parse(myipRawText)
					if (myipData && typeof myipData === 'object' && !Array.isArray(myipData)) {
						this.myipList = Object.keys(myipData).map(key => ({
							source: key,
							geo: myipData[key].geo || '',
							ip: myipData[key].ip || ''
						}))
					} else {
						this.myipList = []
					}
				} catch (e) {
					this.myipList = []
					this.myipRaw = myipRawText || '无法解析的 MyIP 信息'
				}

				// 读取并解析 config_name
				const configRaw = await UciRpc.readFile(configOutput)
				this.configName = this.parseConfigName(configRaw)

				// 如果成功获取到配置名，则进一步获取订阅信息
				if (this.configName) {
					await this.fetchSubInfoInternal(baseUrl, cookieFile, this.configName)
				} else {
					this.subInfoList = []
					this.subInfoRaw = ''
				}

			} catch (e) {
				console.error('获取数据失败:', e)
				this.loginHtml = '获取状态失败：' + (e.message || JSON.stringify(e))
				this.myipRaw = '获取 MyIP 失败：' + (e.message || JSON.stringify(e))
				this.openclashStatus = {}
				this.myipList = []
				this.configName = ''
				this.subInfoList = []
				this.subInfoRaw = ''
			} finally {
				this.loginHtmlLoading = false
				this.myipLoading = false
				this.subInfoLoading = false
			}
		},

		// 内部方法：实际请求订阅信息
		async fetchSubInfoInternal(baseUrl, cookieFile, configName) {
			const encodedName = encodeURIComponent(configName)
			const subInfoOutput = '/tmp/sub_info_get.html'
			const subInfoUrl = `${baseUrl}/admin/services/openclash/sub_info_get?filename=${encodedName}`
			await UciRpc.callUbus('file', 'exec', {
				command: 'curl',
				params: ['-s', '-L', '-b', cookieFile, subInfoUrl, '-o', subInfoOutput]
			}, 15000)

			const raw = await UciRpc.readFile(subInfoOutput)
			this.subInfoRaw = raw || ''
			this.subInfoList = this.parseSubInfo(raw)
		},

		// 单独刷新订阅信息（供按钮调用）
		async fetchSubInfo() {
			if (!this.configName) {
				uni.showToast({ title: '请先获取配置文件', icon: 'none' })
				return
			}
			this.subInfoLoading = true
			try {
				// 需要重新登录获取 cookie，简化直接调用 fetchAllData 全量刷新
				await this.fetchAllData()
			} finally {
				this.subInfoLoading = false
			}
		},

		parseConfigName(raw) {
			if (!raw) return ''
			try {
				const obj = JSON.parse(raw)
				if (typeof obj.config_path === 'string' && obj.config_path) {
					return obj.config_path
				}
				if (Array.isArray(obj.config_name) && obj.config_name.length > 0) {
					const first = obj.config_name[0]
					if (first && typeof first.name === 'string' && first.name) {
						return first.name
					}
				}
				return JSON.stringify(obj)
			} catch (e) {
				return raw.trim()
			}
		},

		// 解析订阅信息：尝试 JSON 解析，转换为键值对数组
		parseSubInfo(raw) {
			if (!raw) return []
			try {
				const data = JSON.parse(raw)
				if (data && typeof data === 'object' && !Array.isArray(data)) {
					return Object.keys(data).map(key => {
						let value = data[key]
						if (typeof value === 'object') {
							value = JSON.stringify(value)
						}
						return { label: key, value: String(value) }
					})
				} else if (Array.isArray(data)) {
					return data.map((item, index) => ({
						label: `[${index}]`,
						value: typeof item === 'object' ? JSON.stringify(item) : String(item)
					}))
				} else {
					return [{ label: '结果', value: String(data) }]
				}
			} catch (e) {
				return []
			}
		},

		async fetchMyIpInfo() {
			this.myipLoading = true
			try {
				await this.fetchAllData()
			} finally {
				this.myipLoading = false
			}
		},

		async onToggleEnable(e) {
			const enable = e.detail.value
			this.submitting = true
			uni.showLoading({ title: enable ? this.$t('openclash.starting') : this.$t('openclash.stopping') })
			let isSuccess = false

			try {
				await UciRpc.setCommit('openclash', this.globalKey, { enable: enable ? '1' : '0' })
				await UciRpc.apply('openclash', enable ? 'restart' : 'stop')
				this.globalConfig.enable = enable ? '1' : '0'
				isSuccess = true
			} catch (err) {
				this.globalConfig.enable = enable ? '0' : '1'
			} finally {
				uni.hideLoading()
				this.submitting = false
				if (isSuccess) {
					uni.showToast({ title: enable ? this.$t('openclash.started') : this.$t('openclash.stopped'), icon: 'success' })
				} else {
					uni.showToast({ title: this.$t('openclash.operation_failed'), icon: 'none' })
				}
			}
		},

		onOperationModeChange(e) {
			this.operationModeIndex = e.detail.value
			this.globalConfig.operation_mode = this.operationModes[this.operationModeIndex].value
		},

		onEnModeChange(e) {
			this.enModeIndex = e.detail.value
			this.globalConfig.en_mode = this.enModes[this.enModeIndex].value
		},

		async saveGlobalSettings() {
			this.submitting = true
			uni.showLoading({ title: this.$t('openclash.saving_reloading') })
			let isSuccess = false

			try {
				await UciRpc.setCommit('openclash', this.globalKey, {
					operation_mode: this.globalConfig.operation_mode,
					en_mode: this.globalConfig.en_mode,
					cn_port: this.globalConfig.cn_port || '9090'
				})
				await UciRpc.apply('openclash', 'reload')
				isSuccess = true
			} catch (err) {
				// 保留 false
			} finally {
				uni.hideLoading()
				this.submitting = false
				if (isSuccess) {
					uni.showToast({ title: this.$t('openclash.save_success'), icon: 'success' })
				} else {
					uni.showToast({ title: this.$t('openclash.save_failed'), icon: 'none' })
				}
			}
		},

		async onToggleSubEnable(item, e) {
			const enabled = e.detail.value
			try {
				await UciRpc.setCommit('openclash', item.secName, {
					name: item.name,
					address: item.address,
					enabled: enabled ? '1' : '0',
					sub_convert: item.sub_convert || '0'
				})
				await UciRpc.apply('openclash', 'reload')
				item.enabled = enabled
			} catch (err) {
				uni.showToast({ title: this.$t('openclash.toggle_sub_failed'), icon: 'none' })
			}
		},

		async updateSubscribe(item) {
			if (this.updatingSub) return
			this.updatingSub = true
			uni.showLoading({ title: this.$t('openclash.updating_sub', { name: item.name }) })

			let isSuccess = false
			let errorMsg = ''

			try {
				await UciRpc.callUbus('file', 'exec', {
					command: '/usr/share/openclash/openclash.sh',
					params: [item.name]
				}, 30000)
				isSuccess = true
			} catch (err) {
				try {
					await UciRpc.apply('openclash', 'reload')
					isSuccess = true
				} catch (e) {
					errorMsg = this.$t('openclash.update_sub_failed')
				}
			} finally {
				uni.hideLoading()
				this.updatingSub = false
				if (isSuccess) {
					uni.showToast({ title: this.$t('openclash.update_sent'), icon: 'success' })
				} else {
					uni.showToast({ title: errorMsg || this.$t('openclash.update_failed'), icon: 'none' })
				}
			}
		},

		async updateAllSubscribes() {
			if (this.updatingSub) return
			if (this.subscribes.length === 0) {
				uni.showToast({ title: this.$t('openclash.no_sub_available'), icon: 'none' })
				return
			}
			this.updatingSub = true
			uni.showLoading({ title: this.$t('openclash.updating_all') })

			let isSuccess = false
			let errorMsg = ''

			try {
				await UciRpc.callUbus('file', 'exec', {
					command: '/usr/share/openclash/openclash.sh'
				}, 45000)
				isSuccess = true
			} catch (err) {
				try {
					await UciRpc.apply('openclash', 'reload')
					isSuccess = true
				} catch (e) {
					errorMsg = this.$t('openclash.batch_update_failed')
				}
			} finally {
				uni.hideLoading()
				this.updatingSub = false
				if (isSuccess) {
					uni.showToast({ title: this.$t('openclash.update_all_sent'), icon: 'success' })
				} else {
					uni.showToast({ title: errorMsg || this.$t('openclash.update_failed'), icon: 'none' })
				}
			}
		},

		openSubModal(item) {
			if (item) {
				this.editingSecName = item.secName
				this.subForm = {
					name: item.name,
					address: item.address,
					enabled: item.enabled,
					sub_convert: item.sub_convert
				}
			} else {
				this.editingSecName = null
				this.subForm = {
					name: '',
					address: '',
					enabled: true,
					sub_convert: '0'
				}
			}
			this.showSubModal = true
		},

		async submitSubForm() {
			if (!this.subForm.name || !this.subForm.address) {
				uni.showToast({ title: this.$t('openclash.fill_complete'), icon: 'none' })
				return
			}
			this.submitting = true
			uni.showLoading({ title: this.$t('openclash.saving_sub') })
			
			const payload = {
				name: this.subForm.name,
				address: this.subForm.address,
				enabled: this.subForm.enabled ? '1' : '0',
				sub_convert: this.subForm.sub_convert || '0'
			}

			let isSuccess = false

			try {
				if (this.editingSecName) {
					await UciRpc.setCommit('openclash', this.editingSecName, payload)
				} else {
					await UciRpc.addCommit('openclash', 'config_subscribe', payload)
				}
				await UciRpc.apply('openclash', 'reload')
				
				this.showSubModal = false
				await this.loadData()
				isSuccess = true
			} catch (err) {
				// 保留 false
			} finally {
				uni.hideLoading()
				this.submitting = false
				if (isSuccess) {
					uni.showToast({ title: this.$t('openclash.sub_saved'), icon: 'success' })
				} else {
					uni.showToast({ title: this.$t('openclash.sub_save_failed'), icon: 'none' })
				}
			}
		},

		async deleteSub(item) {
			uni.showModal({
				title: this.$t('openclash.confirm_delete'),
				content: this.$t('openclash.confirm_delete_content', { name: item.name }),
				success: async (res) => {
					if (res.confirm) {
						uni.showLoading({ title: this.$t('openclash.deleting') })
						let isSuccess = false

						try {
							await UciRpc.deleteCommit('openclash', item.secName)
							await UciRpc.apply('openclash', 'reload')
							await this.loadData()
							isSuccess = true
						} catch (err) {
							// 保留 false
						} finally {
							uni.hideLoading()
							if (isSuccess) {
								uni.showToast({ title: this.$t('openclash.deleted'), icon: 'success' })
							} else {
								uni.showToast({ title: this.$t('openclash.delete_failed'), icon: 'none' })
							}
						}
					}
				}
			})
		},

		async fetchLogs() {
			this.logContent = this.$t('openclash.fetching_log')
			try {
				const logText = await UciRpc.readFile('/tmp/openclash.log')
				this.logContent = logText || this.$t('openclash.no_log')
			} catch (e) {
				if (e === 8) {
					this.logContent = this.$t('openclash.log_permission_error')
				} else {
					this.logContent = this.$t('openclash.no_log')
				}
			}
			this.$nextTick(() => {
				this.logScrollTop = 0
				this.$nextTick(() => {
					this.logScrollTop = 999999
				})
			})
		},

		onLogScroll(e) {
			// 无操作
		}
	}
}
</script>

<style scoped>
/* 原有样式保持不变 */
.container { padding: 16rpx; background-color: #f5f5f5; min-height: 100vh; }
.tab-header { display: flex; background-color: #ffffff; border-radius: 12rpx; margin-bottom: 20rpx; }
.tab-item { flex: 1; text-align: center; padding: 20rpx 0; font-size: 28rpx; color: #666; }
.tab-item.active { color: #007aff; font-weight: bold; border-bottom: 4rpx solid #007aff; }
.loading-box { text-align: center; padding: 100rpx 0; color: #999; font-size: 28rpx; }
.card { background-color: #ffffff; border-radius: 12rpx; padding: 24rpx; margin-bottom: 20rpx; }
.card-title { font-size: 30rpx; font-weight: bold; margin-bottom: 20rpx; border-left: 6rpx solid #007aff; padding-left: 12rpx; }
.form-item { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-bottom: 1rpx solid #eee; }
.label { font-size: 28rpx; color: #333; }
.picker-value { font-size: 28rpx; color: #007aff; }
.input { text-align: right; font-size: 28rpx; }
.btn { margin-top: 20rpx; font-size: 28rpx; }
.btn-primary { background-color: #007aff; color: #fff; }
.btn-success { background-color: #4cd964; color: #fff; }
.btn-warning { background-color: #f0ad4e; color: #fff; }
.btn-danger { background-color: #dd524d; color: #fff; }
.btn-outline { background-color: transparent; border: 1px solid #007aff; color: #007aff; }
.btn-sm { padding: 0 16rpx; height: 56rpx; line-height: 56rpx; font-size: 24rpx; margin: 0 4rpx; }
.sub-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.header-btns { display: flex; align-items: center; }
.empty-tip { text-align: center; color: #999; font-size: 26rpx; padding: 60rpx 0; }
.sub-card { display: flex; justify-content: space-between; align-items: center; }
.sub-info { flex: 1; margin-right: 12rpx; }
.sub-name { font-size: 28rpx; font-weight: bold; }
.sub-url { font-size: 22rpx; color: #999; word-break: break-all; }
.sub-actions { display: flex; align-items: center; }
.log-actions { margin-bottom: 16rpx; text-align: right; }
.log-box { background-color: #1e1e1e; border-radius: 12rpx; padding: 20rpx; height: 68vh; box-sizing: border-box; }
.log-text { color: #00ff00; font-family: monospace; font-size: 22rpx; white-space: pre-wrap; }
.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 999; }
.modal-body { width: 80%; background-color: #fff; border-radius: 16rpx; padding: 30rpx; }
.modal-title { font-size: 32rpx; font-weight: bold; margin-bottom: 20rpx; text-align: center; }
.modal-btns { display: flex; justify-content: space-between; margin-top: 30rpx; }

/* 状态网格样式 */
.status-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}
.status-item {
  width: 50%;
  padding: 16rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-bottom: 1rpx solid #eee;
}
.status-label {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 8rpx;
}
.status-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

/* MyIP 列表样式 */
.myip-list {
  margin-top: 16rpx;
}
.myip-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eee;
}
.myip-source {
  width: 120rpx;
  font-size: 26rpx;
  font-weight: bold;
  color: #007aff;
}
.myip-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.myip-geo {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 4rpx;
}
.myip-ip {
  font-size: 24rpx;
  color: #999;
}

/* 当前配置文件样式 */
.config-name-box {
  padding: 16rpx 0;
}
.config-name-text {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

/* 订阅信息列表样式（新增） */
.subinfo-list {
  margin-top: 16rpx;
}
.subinfo-item {
  display: flex;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #eee;
}
.subinfo-label {
  width: 200rpx;
  font-size: 26rpx;
  color: #666;
}
.subinfo-value {
  flex: 1;
  font-size: 26rpx;
  color: #333;
  word-break: break-all;
}

/* 原始文本回退显示 */
.html-box {
  background-color: #f9f9f9;
  border-radius: 8rpx;
  padding: 16rpx;
  height: 200rpx;
  margin-top: 16rpx;
  box-sizing: border-box;
}
.html-text {
  font-size: 22rpx;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>