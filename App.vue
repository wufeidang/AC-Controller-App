<template>
	<view class="app-container">
		<slot></slot>
	</view>
</template>

<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	.app-container {
		position: relative;
		min-height: 100vh;
	}
</style>
