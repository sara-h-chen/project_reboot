type = ['', 'info', 'success', 'warning', 'danger'];

/*
 * For calculating the average latency
 */
// TODO: Calculate average for all values
var server0tt = 0;
var server1tt = 0;
var server2tt = 0;
var server3tt = 0;
var server4tt = 0;
var server5tt = 0;

server0 = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server1 = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server2 = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server3 = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

server4 = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};

master = {
    labels: [0],
    series: [
        [0],
        [0]
    ]
};
// TODO: Complete the remaining charts
var serverStatus = new Chartist.Line('#serverStatus', server3);

demo = {
    initPickColor: function() {
        $('.pick-class-label').click(function() {
            var new_class = $(this).attr('new-class');
            var old_class = $('#display-buttons').attr('data-class');
            var display_div = $('#display-buttons');
            if (display_div.length) {
                var display_buttons = display_div.find('.btn');
                display_buttons.removeClass(old_class);
                display_buttons.addClass(new_class);
                display_div.attr('data-class', new_class);
            }
        });
    },

    /*
     * series 0: cpu
     * series 1: average latency
     * new series: memory
     */
    updateCharts: function(res) {
        var infoStack = JSON.parse(res);
        for (var i = 0; i < infoStack.length; i++) {
            if (!infoStack[i].machine) {
                continue;
            }
            switch (infoStack[i].machine) {
                case 6050:
                    if(server0.series[0].length > 8) {
                        // TODO: Shift any other series as well
                        server0.labels.shift();
                        server0.series[0].shift();
                    }
                    server0.labels.push(infoStack[i].time.toString().slice(-6,-2));
                    server0.series[0].push(infoStack[i].cpu);
                    // TODO: Create a new chart for latency
                    // server0.series[1].push(infoStack[i].memory);
                    break;
                case 6051:
                    if(server1.series[0].length > 8) {
                        server1.labels.shift();
                        server1.series[0].shift();
                    }
                    server1.labels.push(infoStack[i].time.toString().slice(-6,-2));
                    server1.series[0].push(infoStack[i].cpu);
                    // server1.series[1].push(infoStack[i].memory);
                    break;
                case 6052:
                    if(server2.series[0].length > 8) {
                        server2.labels.shift();
                        server2.series[0].shift();
                    }
                    server2.labels.push(infoStack[i].time.toString().slice(-6,-2));
                    server2.series[0].push(infoStack[i].cpu);
                    // server2.series[1].push(infoStack[i].memory);
                    break;
                case 6053:
                    if(server3.series[0].length > 8) {
                        server3.labels.shift();
                        server3.series[0].shift();
                    }
                    server3.labels.push(infoStack[i].time.toString().slice(-6,-2));
                    server3.series[0].push(infoStack[i].cpu);
                    // server3.series[1].push(infoStack[i].memory);
                    break;
                case 6054:
                    if(server4.series[0].length > 8) {
                        server4.labels.shift();
                        server4.series[0].shift();
                    }
                    server4.labels.push(infoStack[i].time.toString().slice(-6,-2));
                    server4.series[0].push(infoStack[i].cpu);
                    // server4.series[1].push(infoStack[i].memory);
                    break;
                case "master":
                    if(master.series[0].length > 8) {
                        master.labels.shift();
                        master.series[0].shift();
                    }
                    master.labels.push(infoStack[i].time.toString().slice(-6,-2));
                    master.series[0].push(infoStack[i].cpu);
                    // master.series[1].push(infoStack[i].memory);
                    break;
            }
        }
        serverStatus.update();
    },

    // TODO: Notify when server approaches limit
    showNotification: function(from, align) {
        color = Math.floor((Math.random() * 4) + 1);
        $.notify({
            icon: "notifications",
            message: "Welcome to <b>Material Dashboard</b> - a beautiful freebie for every web developer."
        }, {
            type: type[color],
            timer: 4000,
            placement: {
                from: from,
                align: align
            }
        });
    }
};