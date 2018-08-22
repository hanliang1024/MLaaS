System.log(targetVM.name);
System.log(targetVM.runtime.host.name);
var host = targetVM.runtime.host;

var GPUsAvbl = [];
var pciIdsInUse = [];

var vms = host.vm;
for each (vm in vms) {
	if (vm.config != undefined) {
		var device = vm.config.hardware.device;
		for (var i = 0; i < device.length; ++i) {
			if (device[i].deviceInfo.label == "PCI device 0") {
				System.log("found one used by VM=" + vm.name + " id=" + device[i].backing.id);
				pciIdsInUse.push(device[i].backing.id);
			}
		}
	}
}
/*var ptArray = cluster.EnvironmentBrowser.queryConfigTarget(host).pciPassthrough;
for (var i = 0; i < ptArray.length; ++i) {
	pciIds.push(ptArray[i].pciDevice.id);
}*/


for each (device in host.hardware.pciDevice){ 
	if (device.vendorId == NVIDIA_VENDOR_ID 
			&& NVIDIA_GPU_DEVICE_IDS.indexOf(device.deviceId) > -1 
			&& pciIdsInUse.indexOf(device.id) == -1 ){	
		System.log(device.id + " / " + device.deviceName);
		GPUsAvbl.push({id:device.id, deviceId:device.deviceId });
	}
}

var freeGPU = GPUsAvbl[0];
System.log("device will be used id=" + freeGPU["id"] );

var vmSpec = new VcVirtualMachineConfigSpec();
vmSpec.deviceChange = [new VcVirtualDeviceConfigSpec()];
vmSpec.deviceChange[0].operation = VcVirtualDeviceConfigSpecOperation.add;
vmSpec.deviceChange[0].device = new VcVirtualPCIPassthrough();
vmSpec.deviceChange[0].device.backing = new VcVirtualPCIPassthroughDeviceBackingInfo();
vmSpec.deviceChange[0].device.backing.deviceId = freeGPU["deviceId"].toString(16);
vmSpec.deviceChange[0].device.backing.systemId = targetVM.environmentBrowser.queryConfigTarget(null).pciPassthrough[0].systemId;
vmSpec.deviceChange[0].device.backing.deviceName = "PCI device 0";
vmSpec.deviceChange[0].device.backing.vendorId = 4318;
vmSpec.deviceChange[0].device.backing.id = freeGPU["id"];
vmSpec.memoryReservationLockedToMax = true;
var task = targetVM.reconfigVM_Task(vmSpec);
