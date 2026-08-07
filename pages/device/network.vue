<template>
  <view class="container">
    <oa-page-tab :tabs="tab_list" v-model="currentTab" />

    <!-- 网络接口 -->
    <view v-if="currentTab === 0">
      <oa-card v-for="iface in interfaceList" :key="iface.name" padding="lg" :divider="true">
        <view slot="header" class="iface-title">{{ iface.name.toUpperCase() }}<span v-if="iface.l3_device">({{ iface.l3_device }})</span></view>
        <view slot="actions">
          <oa-status-badge type="info" :text="iface.proto || '-'" />
        </view>
        <view class="iface-row" v-if="iface.mac && iface.mac !== '-'">
          <text class="label">{{ $t('network.mac') }}：</text><oa-copy-text class="value" :text="iface.mac">{{ iface.mac }}</oa-copy-text>
        </view>
        <view class="iface-row">
          <text class="label">{{ $t('network.traffic_rx_tx') }}：</text>
          <text class="value">{{ formatBytes(iface.rx_bytes) }} / {{ formatBytes(iface.tx_bytes) }}</text>
        </view>
        <view class="iface-row" v-if="iface.ipv4"><text class="label">{{ $t('network.ipv4') }}：</text><oa-copy-text class="value" :text="iface.ipv4">{{ iface.ipv4 }}</oa-copy-text></view>
        <view class="iface-row ipv6-row" v-if="hasIpv6Data(iface)">
          <text class="label">{{ $t('network.ipv6') }}：</text>
          <view class="value ipv6-value-wrap">
            <text class="ipv6-text">{{ getShortAddress(iface.ipv6List) }}</text>
            <image v-if="hasIpv6MoreDetail(iface)" class="ipv6-eye" src="/static/eye.png" mode="aspectFit" @click.stop="showIpv6Detail(iface)" />
          </view>
        </view>
        <view class="iface-row ipv6-row" v-if="iface.pdAssignList && iface.pdAssignList.length">
          <text class="label">{{ $t('network.ipv6_pd_assign') }}：</text>
          <view class="value ipv6-value-wrap">
            <text class="ipv6-text">{{ getShortAddress(iface.pdAssignList) }}</text>
            <image v-if="hasMoreAddress(iface.pdAssignList)" class="ipv6-eye" src="/static/eye.png" mode="aspectFit" @click.stop="showAddressDetail($t('network.ipv6_pd_assign'), iface.pdAssignList)" />
          </view>
        </view>
        <view class="iface-row" v-if="iface.gateway"><text class="label">{{ $t('network.gateway') }}：</text><oa-copy-text class="value" :text="iface.gateway">{{ iface.gateway }}</oa-copy-text></view>
        <view class="iface-row" v-if="iface.dnsList && iface.dnsList.length">
          <text class="label">{{ $t('network.dns') }}：</text>
          <view class="value" style="text-align:right;">
            <oa-copy-text v-for="dns in iface.dnsList" :key="dns" :text="dns" class="dns-line">{{ dns }}</oa-copy-text>
          </view>
        </view>
      </oa-card>
    </view>

    <!-- 设备 -->
    <view v-else-if="currentTab === 1">
      <view v-for="group in deviceGroups" :key="group.type" class="dev-group">
        <view class="dev-group-title">{{ group.label }} ({{ group.count }})</view>
        <oa-card v-for="dev in group.devices" :key="dev.name" padding="lg" :divider="true">
          <view slot="header" class="dev-title">{{ dev.name }}</view>
          <view slot="actions">
            <oa-status-badge :type="dev.up ? 'up' : 'down'" :text="dev.up ? $t('network.up') : $t('network.down')" />
          </view>
          <view class="dev-row"><text class="label">{{ $t('network.mac') }}：</text><oa-copy-text class="value" :text="dev.macaddr">{{ dev.macaddr || '-' }}</oa-copy-text></view>
          <view v-if="group.type === 'bridge' && dev.ports && dev.ports.length" class="dev-row">
            <text class="label">{{ $t('network.bridge_ports') }}：</text><oa-copy-text class="value" :text="dev.ports.join(', ')">{{ dev.ports.join(', ') }}</oa-copy-text>
          </view>
          <view class="dev-row"><text class="label">{{ $t('network.mtu') }}：</text><oa-copy-text class="value" :text="dev.mtu">{{ dev.mtu || '-' }}</oa-copy-text></view>
          <view class="dev-row"><text class="label">{{ $t('network.receive') }}：</text><text class="value">{{ formatBytes(dev.rx_bytes) }} ({{ formatPacketCount(dev.rx_packets) }} {{ $t('network.packets') }}.)</text></view>
          <view class="dev-row"><text class="label">{{ $t('network.send') }}：</text><text class="value">{{ formatBytes(dev.tx_bytes) }} ({{ formatPacketCount(dev.tx_packets) }} {{ $t('network.packets') }}.)</text></view>
        </oa-card>
      </view>
    </view>

    <!-- 无线 -->
    <view v-else-if="currentTab === 2">
      <oa-empty v-if="wirelessList.length === 0" :text="$t('network.wireless_loading')" />
      <oa-card v-for="radio in wirelessList" :key="radio.name" padding="lg" :divider="true">
        <view slot="header" class="wireless-radio-title">{{ radio.name }}</view>
        <view slot="actions">
          <text class="wireless-radio-edit" @click="goWifiSettings">{{ $t('wifi.settings') }} ›</text>
        </view>
        <view class="wireless-radio-row"><text class="label">{{ $t('network.chip') }}：</text><oa-copy-text class="value" :text="radio.chip">{{ radio.chip }}</oa-copy-text></view>
        <view class="wireless-radio-row"><text class="label">{{ $t('network.band') }}：</text><oa-copy-text class="value" :text="radio.band">{{ radio.band }}</oa-copy-text></view>
        <view class="wireless-radio-row"><text class="label">{{ $t('network.channel') }}：</text><oa-copy-text class="value" :text="String(radio.channel)">{{ radio.channel }}</oa-copy-text></view>
        <view class="wireless-radio-row"><text class="label">{{ $t('network.protocol') }}：</text><oa-copy-text class="value" :text="'802.11' + radio.protocols">802.11{{ radio.protocols }}</oa-copy-text></view>
        <oa-card v-for="iface in radio.interfaces" :key="iface.ifname" padding="md" :divider="true">
          <view slot="header" class="wireless-iface-title">{{ $t('network.ssid') }}：{{ iface.ssid || '-' }}</view>
          <view slot="actions" class="wireless-iface-mode">{{ $t('network.mode') }}：{{ iface.mode || '-' }}</view>
          <view class="wireless-iface-row"><text class="label">{{ $t('network.bssid') }}：</text><oa-copy-text class="value" :text="iface.bssid">{{ iface.bssid }}</oa-copy-text></view>
          <view class="wireless-iface-row"><text class="label">{{ $t('network.signal') }}：</text><text class="value">{{ iface.signal }}</text></view>
          <view class="wireless-iface-row"><text class="label">{{ $t('network.bitrate') }}：</text><text class="value">{{ iface.bitrate }}</text></view>
          <view class="wireless-iface-row"><text class="label">{{ $t('network.encryption') }}：</text><oa-copy-text class="value" :text="iface.encryption">{{ iface.encryption }}</oa-copy-text></view>
        </oa-card>
      </oa-card>
    </view>

    <!-- 带宽监控 -->
    <view v-else-if="currentTab === 3">
      <oa-card :key="'ctrl'" padding="md">
        <view class="selector-label">{{ $t('statistics.select_interface') }}：</view>
        <oa-segmented :value="selectedDevice" :options="interfaceOptions" @change="selectDevice" />
      </oa-card>

      <oa-card :key="'bw'" v-if="selectedDevice && bandwidthData" padding="md">
        <view class="bandwidth-stats">
          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.inbound') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.current') }}：</text>
              <text class="stat-value current-value">{{ formatBandwidth(currentRxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.average') }}：</text>
              <text class="stat-value">{{ formatBandwidth(averageRxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.peak') }}：</text>
              <text class="stat-value">{{ formatBandwidth(peakRxRate) }}</text>
            </view>
          </view>

          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.outbound') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.current') }}：</text>
              <text class="stat-value current-value">{{ formatBandwidth(currentTxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.average') }}：</text>
              <text class="stat-value">{{ formatBandwidth(averageTxRate) }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.peak') }}：</text>
              <text class="stat-value">{{ formatBandwidth(peakTxRate) }}</text>
            </view>
          </view>
        </view>

        <view class="chart-container">
          <view class="chart-wrapper">
            <view class="charts-box chart-box">
              <l-echart ref="chartRef" @finished="initChart" style="width: 100%; height: 100%;"></l-echart>
            </view>
          </view>
        </view>
      </oa-card>

      <oa-empty v-else-if="selectedDevice && !bandwidthData" :text="$t('statistics.loading_bandwidth')" />
      <oa-empty v-else :text="$t('statistics.select_interface_first')" />
    </view>

    <!-- 负载监控 -->
    <view v-else-if="currentTab === 4">
      <oa-card :key="'load'" v-if="loadData" padding="md">
        <view class="load-stats">
          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.current_load') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_1min') }}：</text>
              <text class="stat-value">{{ currentLoad1 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_5min') }}：</text>
              <text class="stat-value">{{ currentLoad5 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_15min') }}：</text>
              <text class="stat-value">{{ currentLoad15 }}</text>
            </view>
          </view>

          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.average') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_1min') }}：</text>
              <text class="stat-value">{{ averageLoad1 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_5min') }}：</text>
              <text class="stat-value">{{ averageLoad5 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_15min') }}：</text>
              <text class="stat-value">{{ averageLoad15 }}</text>
            </view>
          </view>

          <view class="stat-section">
            <view class="stat-title">{{ $t('statistics.peak') }}</view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_1min') }}：</text>
              <text class="stat-value">{{ peakLoad1 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_5min') }}：</text>
              <text class="stat-value">{{ peakLoad5 }}</text>
            </view>
            <view class="stat-row">
              <text class="stat-label">{{ $t('statistics.load_15min') }}：</text>
              <text class="stat-value">{{ peakLoad15 }}</text>
            </view>
          </view>
        </view>

        <view class="chart-container">
          <view class="chart-wrapper">
            <view class="charts-box chart-box">
              <l-echart ref="loadChartRef" @finished="initLoadChart" style="width: 100%; height: 100%;"></l-echart>
            </view>
          </view>
        </view>
      </oa-card>

      <oa-empty v-else :text="$t('statistics.loading_load')" />
    </view>

    <!-- IPv6 详情弹窗（短地址 + 眼睛图标触发） -->
    <uni-popup ref="ipv6DialogPopup" type="center" :mask-click="true">
      <view class="ipv6-dialog popup">
        <view class="ipv6-dialog-header">
          <text class="ipv6-dialog-title">{{ ipv6Dialog.title }}</text>
          <view class="ipv6-dialog-close" @click="closeIpv6Dialog"><text class="ipv6-dialog-close-text">X</text></view>
        </view>
        <scroll-view scroll-y="true" :show-scrollbar="false" class="ipv6-dialog-scroll">
          <view v-for="(section, sIdx) in ipv6Dialog.sections" :key="sIdx" class="ipv6-dialog-section">
            <text class="ipv6-dialog-section-title">{{ section.title }}</text>
            <view class="ipv6-dialog-list">
              <view v-for="(item, iIdx) in section.list" :key="iIdx" class="ipv6-dialog-item">
                <oa-copy-text class="ipv6-dialog-item-text" :text="item">{{ item }}</oa-copy-text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="ipv6-dialog-footer">
          <view class="ipv6-dialog-btn" @click="closeIpv6Dialog"><text>OK</text></view>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import UciRpc from '@/utils/uci-rpc.js'
import { formatBytes, computeBandwidthRates } from '@/utils/format.js'
import { OA_ECHART } from '@/utils/echart-theme.js'

// #ifdef MP
const echarts = require('@/uni_modules/lime-echart/static/app/echarts.min.js')
// #endif
// #ifndef MP
const echarts = null
// #endif

export default {
  data() {
    return {
      currentTab: 0,
      // 网络接口
      interfaceList: [],
      // 设备分组
      deviceGroups: [],
      // 无线
      wirelessList: [],
      // IPv6弹窗
      ipv6Dialog: { title: '', sections: [] },

      // 统计 - 带宽
      deviceList: [],
      selectedDevice: '',
      bandwidthData: null,
      lastUpdateTime: '',
      timer: null,
      currentRxRate: 0,
      currentTxRate: 0,
      averageRxRate: 0,
      averageTxRate: 0,
      peakRxRate: 0,
      peakTxRate: 0,

      // 统计 - 负载
      loadData: null,
      lastLoadUpdateTime: '',
      loadTimer: null,
      currentLoad1: 0,
      currentLoad5: 0,
      currentLoad15: 0,
      averageLoad1: 0,
      averageLoad5: 0,
      averageLoad15: 0,
      peakLoad1: 0,
      peakLoad5: 0,
      peakLoad15: 0,

      // 图表数据
      chartData: {
        timestamps: [],
        rxRates: [],
        txRates: []
      },
      loadChartData: {
        timestamps: [],
        load1: [],
        load5: [],
        load15: []
      },

      // 带宽图表配置
      chartOption: {
        animation: false,
        animationDuration: 0,
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: { backgroundColor: OA_ECHART.axisLabel },
            crossStyle: { color: OA_ECHART.axisLabel, width: 2 }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: OA_ECHART.tooltipBorder,
          borderWidth: 1,
          textStyle: { color: '#fff', fontSize: 12 },
          formatter: (params) => {
            const inbound = this.formatBandwidth(params[0].value)
            const outbound = this.formatBandwidth(params[1].value)
            return this.$t('statistics.inbound') + '：' + inbound + '\n' +
                   this.$t('statistics.outbound') + '：' + outbound
          }
        },
        legend: {
          data: ['入站', '出站'],
          top: 10,
          textStyle: { color: OA_ECHART.legendText }
        },
        grid: {
          left: '10px',
          right: '5px',
          bottom: '20px',
          top: '40px',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: [],
          axisLabel: { show: true, color: OA_ECHART.axisLabel, fontSize: 10, interval: 'auto' },
          axisTick: { show: true, length: 4, lineStyle: { color: OA_ECHART.axisLine } },
          axisLine: { lineStyle: { color: OA_ECHART.axisLine } }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: OA_ECHART.axisLabel,
            fontSize: 10,
            formatter: (value) => this.formatBandwidth(value),
            show: true,
            inside: true
          },
          axisTick: { show: true, length: 4, lineStyle: { color: OA_ECHART.axisLine } },
          axisLine: { show: true, lineStyle: { color: OA_ECHART.axisLine } },
          splitLine: { show: true, lineStyle: { color: OA_ECHART.splitLine, type: 'dashed' } }
        },
        series: [
          {
            name: '入站',
            type: 'line',
            data: [],
            smooth: true,
            animation: false,
            lineStyle: { color: OA_ECHART.inband, width: 1 },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(79, 172, 254, 0.3)' },
                  { offset: 1, color: 'rgba(79, 172, 254, 0.1)' }
                ]
              }
            }
          },
          {
            name: '出站',
            type: 'line',
            data: [],
            smooth: true,
            animation: false,
            lineStyle: { color: OA_ECHART.outband, width: 1 },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(0, 242, 254, 0.3)' },
                  { offset: 1, color: 'rgba(0, 242, 254, 0.1)' }
                ]
              }
            }
          }
        ]
      },

      // 负载图表配置
      loadChartOption: {
        animation: false,
        animationDuration: 0,
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            label: { backgroundColor: OA_ECHART.axisLabel },
            crossStyle: { color: OA_ECHART.axisLabel, width: 2 }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderColor: OA_ECHART.load1,
          borderWidth: 1,
          textStyle: { color: '#fff', fontSize: 12 },
          formatter: (params) => {
            const load1 = params[0].value.toFixed(2)
            const load5 = params[1].value.toFixed(2)
            const load15 = params[2].value.toFixed(2)
            return this.$t('statistics.load_1min') + '：' + load1 + '\n' +
                   this.$t('statistics.load_5min') + '：' + load5 + '\n' +
                   this.$t('statistics.load_15min') + '：' + load15
          }
        },
        legend: {
          data: ['1分钟', '5分钟', '15分钟'],
          top: 10,
          textStyle: { color: OA_ECHART.legendText }
        },
        grid: {
          left: '10px',
          right: '5px',
          bottom: '20px',
          top: '40px',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: [],
          axisLabel: { show: true, color: OA_ECHART.axisLabel, fontSize: 10, interval: 'auto' },
          axisTick: { show: true, length: 4, lineStyle: { color: OA_ECHART.axisLine } },
          axisLine: { lineStyle: { color: OA_ECHART.axisLine } }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: OA_ECHART.axisLabel,
            fontSize: 10,
            show: true,
            inside: true,
            formatter: (value) => value.toFixed(2)
          },
          axisTick: { show: true, length: 4, lineStyle: { color: OA_ECHART.axisLine } },
          axisLine: { show: true, lineStyle: { color: OA_ECHART.axisLine } },
          splitLine: { show: true, lineStyle: { color: OA_ECHART.splitLine, type: 'dashed' } }
        },
        series: [
          {
            name: '1分钟',
            type: 'line',
            data: [],
            smooth: true,
            animation: false,
            lineStyle: { color: OA_ECHART.load1, width: 1 },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
                  { offset: 1, color: 'rgba(255, 107, 107, 0.1)' }
                ]
              }
            }
          },
          {
            name: '5分钟',
            type: 'line',
            data: [],
            smooth: true,
            animation: false,
            lineStyle: { color: OA_ECHART.load5, width: 1 },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
                  { offset: 1, color: 'rgba(78, 205, 196, 0.1)' }
                ]
              }
            }
          },
          {
            name: '15分钟',
            type: 'line',
            data: [],
            smooth: true,
            animation: false,
            lineStyle: { color: OA_ECHART.load15, width: 1 },
            areaStyle: {
              color: {
                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: 'rgba(69, 183, 209, 0.3)' },
                  { offset: 1, color: 'rgba(69, 183, 209, 0.1)' }
                ]
              }
            }
          }
        ]
      }
    }
  },
  computed: {
    tab_list() {
      return [
        { value: 0, label: this.$t('network.interfaces') },
        { value: 1, label: this.$t('network.devices') },
        { value: 2, label: this.$t('network.wireless') },
        { value: 3, label: this.$t('statistics.bandwidth') },
        { value: 4, label: this.$t('statistics.load') }
      ]
    },
    interfaceOptions() {
      return this.deviceList.map(d => ({ value: d.name, label: d.name }))
    }
  },
  onLoad() {
    uni.setNavigationBarTitle({ title: this.$t('network.title') })
    uni.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#F8F8F8' })
    this.fetchInterfaces()
    this.fetchDevices()
  },
  onShow() {
    uni.setNavigationBarTitle({ title: this.$t('network.title') })
    uni.setNavigationBarColor({ frontColor: '#000000', backgroundColor: '#F8F8F8' })
    this.loadCurrentTabData()
    this.manageTimers()
  },
  onUnload() {
    this.stopAutoRefresh()
    this.stopLoadRefresh()
    if (this._chartInstance) {
      this._chartInstance.dispose()
      this._chartInstance = null
    }
    if (this._loadChartInstance) {
      this._loadChartInstance.dispose()
      this._loadChartInstance = null
    }
  },
  onPullDownRefresh() {
    Promise.resolve(this.loadCurrentTabData()).finally(() => uni.stopPullDownRefresh())
  },
  methods: {
    formatBytes,
    formatBandwidth(bytesPerSecond) {
      if (!bytesPerSecond || bytesPerSecond < 0) return '0 B/s'
      const k = 1024
      const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
      const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
      if (i === 0) return Math.round(bytesPerSecond) + ' B/s'
      const value = bytesPerSecond / Math.pow(k, i)
      if (i === 1) return Math.round(value) + ' ' + sizes[i]
      return value.toFixed(1) + ' ' + sizes[i]
    },

    goBack() {
      uni.reLaunch({ url: '/pages/device/device_list' })
    },
    goWifiSettings() {
      uni.navigateTo({ url: '/pages/device/plugins/wifi/index' })
    },

    // 根据当前 tab 加载数据
    loadCurrentTabData() {
      if (this.currentTab === 0 || this.currentTab === 1 || this.currentTab === 2) {
        // 网络相关
        if (this.currentTab === 2) {
          this.fetchWireless()
        } else if (this.interfaceList.length === 0) {
          this.fetchInterfaces()
        }
      } else if (this.currentTab === 3) {
        this.loadBandwidthData()
      } else if (this.currentTab === 4) {
        this.loadLoadData()
      }
    },

    // 管理定时器
    manageTimers() {
      this.stopAutoRefresh()
      this.stopLoadRefresh()
      if (this.currentTab === 3 && this.selectedDevice) {
        this.startAutoRefresh()
      } else if (this.currentTab === 4) {
        this.startLoadRefresh()
      }
    },

    // ========== 网络接口 ==========
    fetchInterfaces() {
      Promise.all([
        UciRpc.callUbus('network.interface', 'dump', {}),
        UciRpc.callUbus('luci-rpc', 'getNetworkDevices', {})
      ]).then(([ifacePayload, devMap]) => {
        let interfaces = (ifacePayload && ifacePayload.interface) || []
        let deviceMap = devMap || {}
        this.interfaceList = interfaces
          .filter(i => i.interface !== 'loopback' && i.up !== false)
          .map(i => {
            let ipv4 = ''
            let ipv6List = []
            let ipv6pdList = []
            let pdAssignList = []
            let dnsList = []
            if (i['ipv4-address'] && i['ipv4-address'].length > 0) {
              const ip = i['ipv4-address'][0]
              ipv4 = ip.address + '/' + ip.mask
            }
            if (i['ipv6-address'] && i['ipv6-address'].length > 0) {
              ipv6List = this.sortIpv6List(i['ipv6-address'].map(ip6 => ip6.address + '/' + ip6.mask))
            }
            if (i['ipv6-prefix'] && i['ipv6-prefix'].length > 0) {
              ipv6pdList = i['ipv6-prefix'].map(pd => {
                if (pd.address && pd.mask !== undefined) {
                  return pd.address + '/' + pd.mask
                }
                return ''
              }).filter(Boolean)
            }
            if (i['ipv6-prefix-assignment'] && i['ipv6-prefix-assignment'].length > 0) {
              pdAssignList = i['ipv6-prefix-assignment'].map(pda => {
                if (pda['local-address'] && pda['local-address'].address && pda['local-address'].mask !== undefined) {
                  return pda['local-address'].address + '/' + pda['local-address'].mask
                } else if (pda.address && pda.mask !== undefined) {
                  return pda.address + '/' + pda.mask
                }
                return ''
              }).filter(Boolean)
            }
            if (i['dns-server'] && Array.isArray(i['dns-server']) && i['dns-server'].length > 0) {
              dnsList = i['dns-server']
            }
            let mac = '-'
            let rx_bytes = 0, rx_packets = 0, tx_bytes = 0, tx_packets = 0
            const dev = deviceMap[i.l3_device]
            if (dev) {
              mac = dev.mac || '-'
              rx_bytes = dev.stats ? dev.stats.rx_bytes : 0
              rx_packets = dev.stats ? dev.stats.rx_packets : 0
              tx_bytes = dev.stats ? dev.stats.tx_bytes : 0
              tx_packets = dev.stats ? dev.stats.tx_packets : 0
            }
            let gateway = ''
            if (i.route && Array.isArray(i.route)) {
              const gw = i.route.find(r => r.target === '0.0.0.0' && r.mask === 0)
              if (gw && gw.nexthop) gateway = gw.nexthop
            }
            return {
              name: i.interface,
              proto: i.proto,
              uptime: i.uptime,
              l3_device: i.l3_device,
              mac,
              rx_bytes,
              rx_packets,
              tx_bytes,
              tx_packets,
              ipv4,
              ipv6List,
              ipv6pdList,
              pdAssignList,
              gateway,
              dnsList
            }
          })

        const loopbackIface = interfaces.find(i => i.interface === 'loopback')
        if (loopbackIface) {
          let mac = '-'
          let rx_bytes = 0, rx_packets = 0, tx_bytes = 0, tx_packets = 0
          const dev = deviceMap[loopbackIface.l3_device]
          if (dev) {
            mac = dev.mac || '-'
            rx_bytes = dev.stats ? dev.stats.rx_bytes : 0
            rx_packets = dev.stats ? dev.stats.rx_packets : 0
            tx_bytes = dev.stats ? dev.stats.tx_bytes : 0
            tx_packets = dev.stats ? dev.stats.tx_packets : 0
          }
          let ipv4 = ''
          if (loopbackIface['ipv4-address'] && loopbackIface['ipv4-address'].length > 0) {
            const ip = loopbackIface['ipv4-address'][0]
            ipv4 = ip.address + '/' + ip.mask
          }
          let ipv6List = []
          if (loopbackIface['ipv6-address'] && loopbackIface['ipv6-address'].length > 0) {
            ipv6List = this.sortIpv6List(loopbackIface['ipv6-address'].map(ip6 => ip6.address + '/' + ip6.mask))
          }
          let ipv6pdList = []
          if (loopbackIface['ipv6-prefix'] && loopbackIface['ipv6-prefix'].length > 0) {
            ipv6pdList = loopbackIface['ipv6-prefix'].map(pd => {
              if (pd.address && pd.mask !== undefined) {
                return pd.address + '/' + pd.mask
              }
              return ''
            }).filter(Boolean)
          }
          let pdAssignList = []
          if (loopbackIface['ipv6-prefix-assignment'] && loopbackIface['ipv6-prefix-assignment'].length > 0) {
            pdAssignList = loopbackIface['ipv6-prefix-assignment'].map(pda => {
              if (pda['local-address'] && pda['local-address'].address && pda['local-address'].mask !== undefined) {
                return pda['local-address'].address + '/' + pda['local-address'].mask
              } else if (pda.address && pda.mask !== undefined) {
                return pda.address + '/' + pda.mask
              }
              return ''
            }).filter(Boolean)
          }
          let dnsList = []
          if (loopbackIface['dns-server'] && Array.isArray(loopbackIface['dns-server']) && loopbackIface['dns-server'].length > 0) {
            dnsList = loopbackIface['dns-server']
          }
          let gateway = ''
          if (loopbackIface.route && Array.isArray(loopbackIface.route)) {
            const gw = loopbackIface.route.find(r => r.target === '0.0.0.0' && r.mask === 0)
            if (gw && gw.nexthop) gateway = gw.nexthop
          }
          this.interfaceList.push({
            name: loopbackIface.interface,
            proto: loopbackIface.proto,
            uptime: loopbackIface.uptime,
            l3_device: loopbackIface.l3_device,
            mac,
            rx_bytes,
            rx_packets,
            tx_bytes,
            tx_packets,
            ipv4,
            ipv6List,
            ipv6pdList,
            pdAssignList,
            gateway,
            dnsList
          })
        }
        this.deviceGroups = this.generateDeviceGroups(deviceMap)
      }).catch(() => {})
    },

    fetchWireless() {
      this.wirelessList = [];
      UciRpc.callUbus('luci-rpc', 'getWirelessDevices', {})
      .then((radios) => {
        if (radios) {
          this.wirelessList = Object.keys(radios).map(radioName => {
            const radio = radios[radioName];
            const iw = radio.iwinfo || {};
            return {
              name: radioName,
              chip: (iw.hardware && iw.hardware.name) || '-',
              band: radio.config && radio.config.band ? radio.config.band.toUpperCase() : '-',
              channel: iw.channel || radio.config.channel || '-',
              protocols: this.formatHwModes(iw.hwmodes_text, iw.hwmodes) || '-',
              interfaces: (radio.interfaces || []).map(iface => {
                const ifaceInfo = iface.iwinfo || {};
                let encryption = this.$t('network.no_encryption');
                if (ifaceInfo.encryption && ifaceInfo.encryption.enabled) {
                  let wpa = '';
                  if (Array.isArray(ifaceInfo.encryption.wpa) && ifaceInfo.encryption.wpa.length > 0) {
                    wpa = ifaceInfo.encryption.wpa.map(v => v === 1 ? 'WPA' : v === 2 ? 'WPA2' : v === 3 ? 'WPA3' : v).join('+');
                  }
                  let auth = '';
                  if (Array.isArray(ifaceInfo.encryption.authentication) && ifaceInfo.encryption.authentication.length > 0) {
                    auth = ifaceInfo.encryption.authentication.map(a => a.toUpperCase()).join('+');
                  }
                  let ciphers = '';
                  if (Array.isArray(ifaceInfo.encryption.ciphers) && ifaceInfo.encryption.ciphers.length > 0) {
                    ciphers = ifaceInfo.encryption.ciphers.map(c => c.toUpperCase()).join('/');
                  }
                  let arr = [];
                  if (wpa) arr.push(wpa.toUpperCase());
                  if (auth) arr.push(auth);
                  let encStr = arr.join(' ');
                  if (ciphers) encStr += ' (' + ciphers + ')';
                  encryption = encStr || this.$t('network.encrypted');
                }
                return {
                  ifname: iface.ifname,
                  ssid: ifaceInfo.ssid || '-',
                  bssid: ifaceInfo.bssid || '-',
                  mode: ifaceInfo.mode || iface.config?.mode || '-',
                  signal: ifaceInfo.signal !== undefined ? ifaceInfo.signal + ' dBm' : '-',
                  noise: ifaceInfo.noise !== undefined ? ifaceInfo.noise + ' dBm' : '-',
                  bitrate: ifaceInfo.bitrate ? (ifaceInfo.bitrate / 1000).toFixed(1) + ' Mbit/s' : '-',
                  encryption
                }
              })
            };
          });
        }
      }).catch(() => {});
    },

    generateDeviceGroups(deviceMap) {
      const typeMap = {
        bridge: this.$t('network.device_type_bridge'),
        ethernet: this.$t('network.device_type_ethernet'),
        wireless: this.$t('network.device_type_wireless'),
        vlan: this.$t('network.device_type_vlan'),
        tunnel: this.$t('network.device_type_tunnel'),
      }
      const groupMap = {}
      Object.values(deviceMap).forEach(d => {
        if (!d.up || d.name === 'lo') return
        let type = d.devtype || 'other'
        if (!typeMap[type]) type = 'other'
        if (!groupMap[type]) groupMap[type] = []
        groupMap[type].push({
          name: d.name,
          up: d.up,
          macaddr: d.mac,
          devtype: d.devtype,
          ports: d.ports || [],
          speed: d.link && d.link.speed ? d.link.speed : '',
          mtu: d.mtu,
          rx_bytes: d.stats ? d.stats.rx_bytes : 0,
          rx_packets: d.stats ? d.stats.rx_packets : 0,
          tx_bytes: d.stats ? d.stats.tx_bytes : 0,
          tx_packets: d.stats ? d.stats.tx_packets : 0
        })
      })
      if (groupMap.ethernet) {
        const ethList = groupMap.ethernet.filter(dev => dev.name.startsWith('eth'))
        const otherList = groupMap.ethernet.filter(dev => !dev.name.startsWith('eth'))
        groupMap.ethernet = [...ethList, ...otherList]
      }
      const groupArr = Object.keys(groupMap).map(type => ({
        type,
        label: typeMap[type] || this.$t('network.other'),
        count: groupMap[type].length,
        devices: groupMap[type]
      }))
      groupArr.sort((a, b) => {
        if (a.type === 'bridge') return -1
        if (b.type === 'bridge' || a.type === 'other') return 1
        if (b.type === 'other') return -1
        return 0
      })
      return groupArr
    },

    // IPv6 工具
    sortIpv6List(arr) {
      if (!Array.isArray(arr)) return []
      return [...arr].sort((a, b) => {
        const aUla = String(a || '').toLowerCase().startsWith('fd')
        const bUla = String(b || '').toLowerCase().startsWith('fd')
        if (aUla === bUla) return 0
        return aUla ? 1 : -1
      })
    },
    getShortAddress(arr) {
      if (!Array.isArray(arr) || arr.length === 0) return '-'
      const sorted = this.sortIpv6List(arr)
      const first = String(sorted[0] || '')
      return first.length > 30 ? first.slice(0, 30) + '...' : first
    },
    hasIpv6MoreDetail(iface) {
      if (!iface) return false
      const ipv6Len = Array.isArray(iface.ipv6List) ? iface.ipv6List.length : 0
      const pdLen = Array.isArray(iface.ipv6pdList) ? iface.ipv6pdList.length : 0
      return pdLen > 0 || ipv6Len > 1
    },
    hasIpv6Data(iface) {
      if (!iface) return false
      const ipv6Len = Array.isArray(iface.ipv6List) ? iface.ipv6List.length : 0
      const pdLen = Array.isArray(iface.ipv6pdList) ? iface.ipv6pdList.length : 0
      return ipv6Len + pdLen > 0
    },
    showIpv6Detail(iface) {
      if (!iface) return
      const ipv6 = this.sortIpv6List(Array.isArray(iface.ipv6List) ? iface.ipv6List : [])
      const pd = Array.isArray(iface.ipv6pdList) ? iface.ipv6pdList : []
      const sections = []
      if (ipv6.length > 0) sections.push({ title: this.$t('network.ipv6'), list: ipv6 })
      if (pd.length > 0) sections.push({ title: this.$t('network.ipv6_pd'), list: pd })
      if (sections.length !== 0) {
        this.openIpv6Dialog(this.$t('network.ipv6'), sections)
      }
    },
    hasMoreAddress(arr) {
      if (!Array.isArray(arr) || arr.length === 0) return false
      if (arr.length > 1) return true
      return String(arr[0] || '').length > 30
    },
    showAddressDetail(title, list) {
      if (Array.isArray(list) && list.length !== 0) {
        this.openIpv6Dialog(title || this.$t('network.ipv6'), [{ title: title || this.$t('network.ipv6'), list }])
      }
    },
    openIpv6Dialog(title, sections) {
      if (!Array.isArray(sections) || sections.length === 0) return
      const filtered = sections
        .map(s => ({
          title: s && s.title ? s.title : this.$t('network.ipv6'),
          list: Array.isArray(s && s.list) ? s.list.filter(Boolean) : []
        }))
        .filter(s => s.list.length > 0)
      if (filtered.length === 0) return
      this.ipv6Dialog = { title: title || this.$t('network.ipv6'), sections: filtered }
      this.$nextTick(() => {
        if (this.$refs.ipv6DialogPopup) this.$refs.ipv6DialogPopup.open()
      })
    },
    closeIpv6Dialog() {
      if (this.$refs.ipv6DialogPopup) this.$refs.ipv6DialogPopup.close()
    },
    formatHwModes(hwmodes_text, hwmodes) {
      if (hwmodes_text) return hwmodes_text
      if (hwmodes && Array.isArray(hwmodes)) {
        return hwmodes.join(', ').toUpperCase()
      }
      return null
    },
    formatPacketCount(val) {
      const n = Number(val || 0)
      if (n >= 1000) {
        const k = n / 1000
        const str = k >= 100 ? k.toFixed(0) : k.toFixed(1)
        return str.replace(/\.0$/, '') + 'k'
      }
      return String(Math.floor(n))
    },

    // ========== 统计 - 带宽 ==========
    fetchDevices() {
      UciRpc.callUbus('luci-rpc', 'getNetworkDevices', {})
      .then((deviceMap) => {
        if (deviceMap) {
          this.deviceList = Object.keys(deviceMap)
            .filter(devName => devName !== 'lo' && deviceMap[devName].up !== false)
            .map(devName => ({
              name: devName,
              type: deviceMap[devName].type || '-',
              macaddr: deviceMap[devName].mac || '-'
            }))
            .sort((a, b) => {
              if (a.name === 'br-lan') return -1
              if (b.name === 'br-lan') return 1
              return a.name.localeCompare(b.name)
            })
          if (this.deviceList.length > 0 && !this.selectedDevice) {
            const brLanDevice = this.deviceList.find(d => d.name === 'br-lan')
            const defaultDevice = brLanDevice ? brLanDevice.name : this.deviceList[0].name
            this.selectDevice(defaultDevice)
          }
        }
      })
      .catch(() => {
        uni.showToast({ title: this.$t('statistics.get_interfaces_failed'), icon: 'none' })
      })
    },
    selectDevice(devname) {
      this.selectedDevice = devname
      this.chartData.timestamps = []
      this.chartData.rxRates = []
      this.chartData.txRates = []
      this.fetchBandwidthData()
      this.startAutoRefresh()
    },
    loadBandwidthData() {
      if (this.deviceList.length === 0) {
        this.fetchDevices()
      } else if (this.selectedDevice) {
        this.fetchBandwidthData()
      }
    },
    fetchBandwidthData() {
      if (!this.selectedDevice) return
      UciRpc.callUbus('luci', 'getRealtimeStats', { mode: 'interface', device: this.selectedDevice })
      .then((res) => {
        if (res && res.result) {
          this.bandwidthData = res.result
          this.processBandwidthData()
          this.updateLastUpdateTime()
        } else {
          this.bandwidthData = null
        }
      })
      .catch(() => {
        this.bandwidthData = null
        uni.showToast({ title: this.$t('statistics.get_bandwidth_failed'), icon: 'none' })
      })
    },
    processBandwidthData() {
      if (!this.bandwidthData || this.bandwidthData.length < 2) return
      const { rxRates, txRates } = computeBandwidthRates(this.bandwidthData)
      if (rxRates.length === 0) return
      this.currentRxRate = rxRates[rxRates.length - 1]
      this.currentTxRate = txRates[txRates.length - 1]
      this.averageRxRate = rxRates.reduce((a, b) => a + b, 0) / rxRates.length
      this.averageTxRate = txRates.reduce((a, b) => a + b, 0) / txRates.length
      this.peakRxRate = Math.max(...rxRates)
      this.peakTxRate = Math.max(...txRates)
      this.updateChartData()
    },
    updateLastUpdateTime() {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      this.lastUpdateTime = `${hours}:${minutes}:${seconds}`
    },
    startAutoRefresh() {
      this.stopAutoRefresh()
      this.timer = setInterval(() => {
        if (this.selectedDevice) {
          this.fetchBandwidthData()
        }
      }, 3000)
    },
    stopAutoRefresh() {
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    // 带宽图表
    async initChart() {
      if (!this.$refs.chartRef) return
      try {
        const chart = await this.$refs.chartRef.init(echarts)
        this._chartInstance = chart
        this.chartOption.legend.data = [
          this.$t('statistics.inbound'),
          this.$t('statistics.outbound')
        ]
        this.chartOption.series[0].name = this.$t('statistics.inbound')
        this.chartOption.series[1].name = this.$t('statistics.outbound')
        this._chartInstance.setOption(this.chartOption, false)
        if (this.chartData.timestamps.length > 0) {
          this.updateChart()
        }
      } catch (error) {
        console.error('chart init failed:', error)
      }
    },
    updateChartData() {
      if (!this.bandwidthData || this.bandwidthData.length < 2) return
      for (let i = 1; i < this.bandwidthData.length; i++) {
        const current = this.bandwidthData[i]
        const previous = this.bandwidthData[i - 1]
        if (current && previous) {
          const timeDelta = current[0] - previous[0]
          if (timeDelta > 0) {
            const rxRate = (current[1] - previous[1]) / timeDelta
            const txRate = (current[3] - previous[3]) / timeDelta
            this.addDataPoint(current[0], rxRate, txRate)
          }
        }
      }
      if (this._chartInstance) {
        this.updateChart()
      }
    },
    addDataPoint(timestamp, rxRate, txRate) {
      const maxPoints = 60
      const lastTimestamp = this.chartData.timestamps[this.chartData.timestamps.length - 1]
      if (lastTimestamp && lastTimestamp === timestamp) return
      if (this.chartData.timestamps.length >= maxPoints) {
        this.chartData.timestamps.shift()
        this.chartData.rxRates.shift()
        this.chartData.txRates.shift()
      }
      this.chartData.timestamps.push(timestamp)
      this.chartData.rxRates.push(Math.max(0, rxRate))
      this.chartData.txRates.push(Math.max(0, txRate))
    },
    updateChart() {
      if (!this._chartInstance || !this.chartData.timestamps.length) return
      const categories = this.chartData.timestamps.map((timestamp) => {
        const date = new Date(timestamp * 1000)
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        return `${hours}:${minutes}:${seconds}`
      })
      const allRates = [...this.chartData.rxRates, ...this.chartData.txRates]
      const maxRate = Math.max(...allRates)
      const minRate = Math.min(...allRates)
      const rateRange = maxRate - minRate
      let yAxisMax = rateRange < 100 ? Math.max(maxRate + 100, 500) : maxRate + (rateRange * 0.2)
      const yAxisMin = Math.max(0, minRate - (rateRange * 0.1))
      const option = {
        ...this.chartOption,
        animation: false,
        animationDuration: 0,
        xAxis: { ...this.chartOption.xAxis, data: categories },
        yAxis: { ...this.chartOption.yAxis, min: yAxisMin, max: yAxisMax },
        series: [
          { ...this.chartOption.series[0], data: this.chartData.rxRates, animation: false },
          { ...this.chartOption.series[1], data: this.chartData.txRates, animation: false }
        ]
      }
      this._chartInstance.setOption(option, false)
    },

    // ========== 统计 - 负载 ==========
    loadLoadData() {
      this.fetchLoadData()
    },
    fetchLoadData() {
      UciRpc.callUbus('luci', 'getRealtimeStats', { mode: 'load' })
      .then((res) => {
        if (res && res.result) {
          this.loadData = res.result
          this.processLoadData()
          this.updateLastLoadUpdateTime()
        } else {
          this.loadData = null
        }
      })
      .catch(() => {
        this.loadData = null
        uni.showToast({ title: this.$t('statistics.get_load_failed'), icon: 'none' })
      })
    },
    processLoadData() {
      if (!this.loadData || this.loadData.length === 0) return
      const latest = this.loadData[this.loadData.length - 1]
      if (latest) {
        this.currentLoad1 = (latest[1] / 100).toFixed(2)
        this.currentLoad5 = (latest[2] / 100).toFixed(2)
        this.currentLoad15 = (latest[3] / 100).toFixed(2)
        this.calculateLoadStats()
        this.updateLoadChartData()
      }
    },
    calculateLoadStats() {
      if (!this.loadData || this.loadData.length === 0) return
      const loads1 = []
      const loads5 = []
      const loads15 = []
      this.loadData.forEach(dataPoint => {
        loads1.push(dataPoint[1] / 100)
        loads5.push(dataPoint[2] / 100)
        loads15.push(dataPoint[3] / 100)
      })
      const sum1 = loads1.reduce((sum, load) => sum + load, 0)
      const sum5 = loads5.reduce((sum, load) => sum + load, 0)
      const sum15 = loads15.reduce((sum, load) => sum + load, 0)
      this.averageLoad1 = (sum1 / loads1.length).toFixed(2)
      this.averageLoad5 = (sum5 / loads5.length).toFixed(2)
      this.averageLoad15 = (sum15 / loads15.length).toFixed(2)
      this.peakLoad1 = Math.max(...loads1).toFixed(2)
      this.peakLoad5 = Math.max(...loads5).toFixed(2)
      this.peakLoad15 = Math.max(...loads15).toFixed(2)
    },
    updateLoadChartData() {
      if (!this.loadData || this.loadData.length === 0) return
      this.loadData.forEach(dataPoint => {
        this.addLoadDataPoint(dataPoint[0], dataPoint[1], dataPoint[2], dataPoint[3])
      })
      if (this._loadChartInstance) {
        this.updateLoadChart()
      }
    },
    addLoadDataPoint(timestamp, load1, load5, load15) {
      const maxPoints = 60
      const lastTimestamp = this.loadChartData.timestamps[this.loadChartData.timestamps.length - 1]
      if (lastTimestamp && lastTimestamp === timestamp) return
      if (this.loadChartData.timestamps.length >= maxPoints) {
        this.loadChartData.timestamps.shift()
        this.loadChartData.load1.shift()
        this.loadChartData.load5.shift()
        this.loadChartData.load15.shift()
      }
      this.loadChartData.timestamps.push(timestamp)
      this.loadChartData.load1.push(load1 / 100)
      this.loadChartData.load5.push(load5 / 100)
      this.loadChartData.load15.push(load15 / 100)
    },
    updateLoadChart() {
      if (!this._loadChartInstance || !this.loadChartData.timestamps.length) return
      const categories = this.loadChartData.timestamps.map((timestamp) => {
        const date = new Date(timestamp * 1000)
        const hours = date.getHours().toString().padStart(2, '0')
        const minutes = date.getMinutes().toString().padStart(2, '0')
        const seconds = date.getSeconds().toString().padStart(2, '0')
        return `${hours}:${minutes}:${seconds}`
      })
      const allLoads = [...this.loadChartData.load1, ...this.loadChartData.load5, ...this.loadChartData.load15]
      const maxLoad = Math.max(...allLoads)
      const minLoad = Math.min(...allLoads)
      const loadRange = maxLoad - minLoad
      let yAxisMax = loadRange < 0.1 ? Math.max(maxLoad + 0.1, 0.5) : maxLoad + (loadRange * 0.2)
      const yAxisMin = Math.max(0, minLoad - (loadRange * 0.1))
      const option = {
        ...this.loadChartOption,
        animation: false,
        animationDuration: 0,
        xAxis: { ...this.loadChartOption.xAxis, data: categories },
        yAxis: { ...this.loadChartOption.yAxis, min: yAxisMin, max: yAxisMax },
        series: [
          { ...this.loadChartOption.series[0], data: this.loadChartData.load1, animation: false },
          { ...this.loadChartOption.series[1], data: this.loadChartData.load5, animation: false },
          { ...this.loadChartOption.series[2], data: this.loadChartData.load15, animation: false }
        ]
      }
      this._loadChartInstance.setOption(option, false)
    },
    async initLoadChart() {
      if (!this.$refs.loadChartRef) return
      try {
        const chart = await this.$refs.loadChartRef.init(echarts)
        this._loadChartInstance = chart
        this.loadChartOption.legend.data = [
          this.$t('statistics.load_1min'),
          this.$t('statistics.load_5min'),
          this.$t('statistics.load_15min')
        ]
        this.loadChartOption.series[0].name = this.$t('statistics.load_1min')
        this.loadChartOption.series[1].name = this.$t('statistics.load_5min')
        this.loadChartOption.series[2].name = this.$t('statistics.load_15min')
        this._loadChartInstance.setOption(this.loadChartOption, false)
        if (this.loadChartData.timestamps.length > 0) {
          this.updateLoadChart()
        }
      } catch (error) {
        console.error('load chart init failed:', error)
      }
    },
    startLoadRefresh() {
      this.stopLoadRefresh()
      this.loadTimer = setInterval(() => {
        this.fetchLoadData()
      }, 3000)
    },
    stopLoadRefresh() {
      if (this.loadTimer) {
        clearInterval(this.loadTimer)
        this.loadTimer = null
      }
    },
    updateLastLoadUpdateTime() {
      const now = new Date()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      const seconds = String(now.getSeconds()).padStart(2, '0')
      this.lastLoadUpdateTime = `${hours}:${minutes}:${seconds}`
    }
  },
  watch: {
    currentTab(val) {
      this.loadCurrentTabData()
      this.stopAutoRefresh()
      this.stopLoadRefresh()
      if (val === 3 && this.selectedDevice) {
        this.startAutoRefresh()
      } else if (val === 4) {
        this.startLoadRefresh()
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '@/styles/common.scss';

// 网络接口
.iface-title {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 600;
  color: $oa-text;
  word-break: break-all;
}
.iface-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid $oa-hairline;
}
.iface-row:last-child {
  border-bottom: none;
}
.iface-row .label {
  font-size: 24rpx;
  color: $oa-text-muted;
  font-weight: 500;
  min-width: 140rpx;
  flex-shrink: 0;
}
.iface-row .value {
  font-size: 24rpx;
  font-weight: 500;
  color: $oa-text;
  text-align: right;
  max-width: 64%;
  word-break: break-all;
  flex: 1;
}
.ipv6-row {
  align-items: center;
}
.ipv6-value-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10rpx;
  max-width: 68%;
  min-width: 0;
  text-align: right;
}
.ipv6-text {
  display: block;
  max-width: 420rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $oa-text;
}
.ipv6-eye {
  width: 34rpx;
  height: 34rpx;
  flex-shrink: 0;
  opacity: 0.92;
}
.ipv6-dialog {
  width: 660rpx;
  max-height: 72vh;
  border: 1rpx solid $oa-hairline;
  box-sizing: border-box;
}
.ipv6-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
  padding-bottom: 10rpx;
  border-bottom: 1rpx solid $oa-hairline;
}
.ipv6-dialog-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $oa-text;
  padding-right: 10rpx;
}
.ipv6-dialog-close {
  width: 44rpx;
  height: 44rpx;
  border-radius: $oa-radius-lg;
  background: $oa-surface-sunken;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ipv6-dialog-close-text {
  font-size: 30rpx;
  line-height: 30rpx;
  color: $oa-text-subtle;
  font-weight: 500;
}
.ipv6-dialog-scroll {
  max-height: 52vh;
}
.ipv6-dialog-section {
  margin-bottom: 16rpx;
}
.ipv6-dialog-section:last-child {
  margin-bottom: 0;
}
.ipv6-dialog-section-title {
  display: block;
  font-size: 24rpx;
  font-weight: 600;
  color: $oa-brand;
  margin-bottom: 10rpx;
}
.ipv6-dialog-list {
  background: $oa-surface-overlay;
  border: 1rpx solid $oa-hairline;
  border-radius: $oa-radius-md;
  overflow: hidden;
}
.ipv6-dialog-item {
  padding: 16rpx 18rpx;
  border-bottom: 1rpx solid $oa-hairline;
}
.ipv6-dialog-item:last-child {
  border-bottom: none;
}
.ipv6-dialog-item-text {
  font-size: 24rpx;
  font-weight: 500;
  color: $oa-text;
  word-break: break-all;
  line-height: 1.45;
}
.ipv6-dialog-footer {
  margin-top: 18rpx;
  display: flex;
  justify-content: flex-end;
}
.ipv6-dialog-btn {
  min-width: 140rpx;
  padding: 10rpx 22rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: $oa-brand;
  background: $oa-brand-subtle;
  border: 1rpx solid $oa-brand-subtle;
  border-radius: $oa-radius-full;
}

// 设备
.dev-title {
  flex: 1;
  min-width: 0;
  font-size: 30rpx;
  font-weight: 600;
  color: $oa-text;
  word-break: break-all;
}
.dev-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10rpx 0;
  border-bottom: 1rpx solid $oa-hairline;
}
.dev-row:last-child {
  border-bottom: none;
}
.dev-row .label {
  font-size: 24rpx;
  color: $oa-text-muted;
  font-weight: 500;
  min-width: 140rpx;
  flex-shrink: 0;
}
.dev-row .value {
  font-size: 24rpx;
  color: $oa-text;
  font-weight: 500;
  text-align: right;
  max-width: 64%;
  word-break: break-all;
  flex: 1;
}
.dev-group {
  margin-bottom: 20rpx;
}
.dev-group-title {
  font-size: 24rpx;
  font-weight: 600;
  color: $oa-text;
  margin: 18rpx 0 12rpx 0;
  padding-left: 12rpx;
  border-left: 6rpx solid $oa-brand;
  background: transparent;
  box-shadow: none;
}

// 无线
.wireless-radio-title {
  font-size: 28rpx;
  font-weight: 700;
  color: $oa-text;
}
.wireless-radio-chip {
  font-size: 22rpx;
  color: $oa-text-subtle;
}
.wireless-radio-edit {
  font-size: 24rpx;
  color: $oa-brand;
  font-weight: 600;
}
.wireless-radio-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
  border-bottom: 1rpx solid $oa-hairline;
  font-size: 26rpx;
  color: $oa-text-muted;
}
.wireless-radio-row:last-child {
  border-bottom: none;
}
.wireless-iface-title {
  font-size: 26rpx;
  font-weight: 700;
  color: $oa-text;
}
.wireless-iface-mode {
  font-size: 22rpx;
  color: $oa-text-muted;
}
.wireless-iface-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
  border-bottom: 1rpx solid $oa-hairline;
  font-size: 26rpx;
  color: $oa-text-muted;
}
.wireless-iface-row:last-child {
  border-bottom: none;
}

// 统计通用
.selector-label {
  font-size: 28rpx;
  color: $oa-text;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.bandwidth-stats {
  display: flex;
  gap: 30rpx;
  margin-bottom: 30rpx;
}
.load-stats {
  display: flex;
  gap: 20rpx;
  margin-bottom: 30rpx;
}
.stat-section {
  flex: 1;
  background: $oa-surface-sunken;
  border-radius: $oa-radius-md;
  padding: 15rpx;
  min-width: 0;
}
.stat-title {
  font-size: 24rpx;
  font-weight: bold;
  color: $oa-text;
  margin-bottom: 15rpx;
  text-align: center;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.stat-label {
  font-size: 22rpx;
  color: $oa-text-muted;
}
.stat-value {
  font-size: 22rpx;
  color: $oa-text;
  font-weight: bold;
}
.current-value {
  color: $oa-brand;
}
.chart-container {
  background: $oa-surface-sunken;
  border-radius: $oa-radius-md;
  padding: 5rpx;
}
.chart-wrapper {
  height: 600rpx;
  background: $oa-surface;
  border-radius: 10rpx;
  overflow: hidden;
  position: relative;
}
.charts-box {
  width: 100%;
  height: 100%;
}
</style>