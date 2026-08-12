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
					
					<!-- 运行模式 -->
					<view class="form-item">
						<text class="label">{{ $t('openclash.operation_mode') }}</text>
						<picker :value="operationModeIndex" :range="operationModeLabels" @change="onOperationModeChange">
							<view class="picker-value">{{ operationModeLabels[operationModeIndex] }}</view>
						</picker>
					</view>

					<!-- Core 模式 -->
					<view class="form-item">
						<text class="label">{{ $t('openclash.core_mode') }}</text>
						<picker :value="enModeIndex" :range="enModeLabels" @change="onEnModeChange">
							<view class="picker-value">{{ enModeLabels[enModeIndex] }}</view>
						</picker>
					</view>

					<!-- Dashboard 端口 -->
					<view class="form-item">
						<text class="label">{{ $t('openclash.dashboard_port') }}</text>
						<input class="input" type="number" v-model="globalConfig.cn_port" :placeholder="$t('openclash.default_port_9090')" />
					</view>

					<button class="btn btn-primary" :loading="submitting" @click="saveGlobalSettings">
						{{ $t('openclash.save_and_reload') }}
					</button>
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

			<!-- Tab 2: 运行日志（已添加滚动到底部功能） -->
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
					<!-- 底部锚点，便于定位 -->
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
			logScrollTop: 0,  // 新增：控制滚动位置

			// 运行模式选项（value 固定，label 从翻译获取）
			operationModes: [
				{ value: 'redir-host' },
				{ value: 'fake-ip' },
				{ value: 'script' }
			],
			operationModeIndex: 0,

			// Core 模式选项
			enModes: [
				{ value: 'redir-host' },
				{ value: 'fake-ip' },
				{ value: 'tun' },
				{ value: 'mix' }
			],
			enModeIndex: 0,

			// 弹窗与表单
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
		// 从翻译获取 Tab 标题
		tabs() {
			return [
				this.$t('openclash.tab_runtime'),
				this.$t('openclash.tab_subscription'),
				this.$t('openclash.tab_log')
			]
		},
		// 运行模式标签（只读）
		operationModeLabels() {
			return this.operationModes.map(m => this.$t(`openclash.mode_${m.value}`))
		},
		// Core 模式标签
		enModeLabels() {
			return this.enModes.map(m => this.$t(`openclash.core_${m.value}`))
		}
	},
	mounted() {
		this.loadData()
	},
	watch: {
		currentTab(val) {
			if (val === 2) {
				this.fetchLogs()  // 切换到日志 Tab 时自动获取并滚动到底部
			}
		}
	},
	methods: {
		// 1. 初始化读取 OpenClash UCI 配置
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

		// 2. 切换主服务开关
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

		// 3. 更改 Operation Mode Picker
		onOperationModeChange(e) {
			this.operationModeIndex = e.detail.value
			this.globalConfig.operation_mode = this.operationModes[this.operationModeIndex].value
		},

		// 4. 更改 En Mode Picker
		onEnModeChange(e) {
			this.enModeIndex = e.detail.value
			this.globalConfig.en_mode = this.enModes[this.enModeIndex].value
		},

		// 5. 保存全局配置
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

		// 6. 切换单条订阅启用状态
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

		// 7. 更新指定单条在线订阅
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

		// 8. 更新全部在线订阅
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

		// 9. 打开订阅编辑/新增弹窗
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

		// 10. 提交订阅表单（新增/编辑）
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

		// 11. 删除订阅
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

		// 12. 读取运行日志（自动滚动到底部）
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
			// 滚动到底部（先重置再设大值触发滚动）
			this.$nextTick(() => {
				this.logScrollTop = 0
				this.$nextTick(() => {
					this.logScrollTop = 999999
				})
			})
		},

		// 监听滚动事件（可留空）
		onLogScroll(e) {
			// 无操作
		}
	}
}
</script>

<style scoped>
/* 样式保持原样，无变化 */
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
</style>