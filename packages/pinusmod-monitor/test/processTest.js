var processMonitor = require('../dist/lib/processMonitor');

function test() {
	var param = {
		pid: 4838,
		serverId: 'auth-server-1'
	};
	processMonitor.getPsInfo(param, function (err, data) {
		if (!!err) {
			console.log(err);
			return;
		}
		console.log('process information is :', data);
	});
};
test();
