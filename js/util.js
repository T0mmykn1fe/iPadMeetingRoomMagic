var ParameterParser = new (function() {
	this.parse = function() {
		var hashTag = window.location.hash.substr(1),
			qsParams = window.location.search.substr(1),
			vars = hashTag.split('&').concat(qsParams.split('&')),
			params = {};
		
		for(var i = 0, l = vars.length; i < l; i++) {
			var nameVal = vars[i].split('=');
			if(nameVal[0]) {
				params[decodeURIComponent(nameVal[0])] = nameVal.length > 1 ? decodeURIComponent(nameVal[1]) : true;
			}
		}
		
		return params;
	};

	return this;
})();

var Logger = (function(){
	var vars = ParameterParser.parse();

	return {
		log: function(msg, errObj) {
			msg && console.log(msg);
			errObj && setTimeout(function() { throw errObj; }, 0);

            if (DebugSettings.logServer) {

            }
			
			if (vars.debug) {
				debugger;
			}
		}
	};
})();

var ActivityMonitor = (function() {
	var timeouts = [],
		timeoutIndex = 0,
		lastActivityTime = new Date(),
		idleTimeoutHandle = null,
		nextTimeoutHandle = 0;
		
	function recordActivity() {
        try {
            lastActivityTime = new Date();
            timeoutIndex = 0;
            idleCallback();
        } catch (e) {
            Logger.log("Error in idle recording.", e)
        }
	}
	function idleCallback() {
		var now = new Date(),
			idleTimeMs = msBetween(lastActivityTime, now);
			
		if(idleTimeoutHandle) {
			clearTimeout(idleTimeoutHandle);
			idleTimeoutHandle = null;
		}
		
		for (var t = timeouts.length; timeoutIndex < t; timeoutIndex++) {
			var timeout = timeouts[timeoutIndex];
			if (timeout.idleMs <= idleTimeMs) {
				try { timeout.handler(); } catch(e) {}
			} else {
				var timeoutAgainIn = timeout.idleMs - msBetween(lastActivityTime, new Date());
				idleTimeoutHandle = setTimeout(idleCallback, timeoutAgainIn > 0 ? timeoutAgainIn : 1);
				break;
			}
		}
	}
	function msBetween(dateA, dateB) {
		return (dateB - dateA);
	}
	
	$(document)
		.mousemove(recordActivity)
		.click(recordActivity)
		.bind('touchstart', recordActivity)
		.bind('touchmove', recordActivity)
		.bind('touchend', recordActivity);
		
	return {
		setIdleHandler : function(idleMs, handler) {
			var i = 0,
				l = timeouts.length;
			while (i < l) {
				if(idleMs < timeouts[i].idleMs) {
					timeouts.splice(i, 0, {
						idleMs: idleMs,
						handler: handler,
						timeoutHandle: nextTimeoutHandle
					});
					break;
				}
				i++;
			}				
			if (i == l) {
				timeouts.push({
						idleMs: idleMs,
						handler: handler,
						timeoutHandle: nextTimeoutHandle
					});
			}
			idleCallback();
			
			return nextTimeoutHandle++;
		},
		clearIdleHandler : function(idleTimeoutHandle) {
			for (var i = 0, l = timeouts.length; i < l; i++) {
				if(idleTimeoutHandle == timeouts[i].timeoutHandle) {
					if (i < timeoutIndex) timeoutIndex--;
					timeouts.splice(i, 1);
					break;
				}
			}
		}
	};
})();

var DebugSettings = (function(){
	var vars = ParameterParser.parse();
	
	return {
		now : vars.debug ?
				function() { return new Date(2011, 6, 1, 15, 25, 0); } :
				function() {}
	};
})();