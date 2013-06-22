var maongoObj=require("./MongoInstance.js");
var MyTestObj;
var utilitiesObj;

maongoObj.startConnection(collectionInit);

var colors = require('colors');
var https = require('https');
var http = require('http');
var requestNumber = 0;
var config = {
    n: 1,
    concurrency: 1
};
var stats = {
    clients: 0,
    inproc: 0
};
var requestStats = {
    clients: 0,
    inprocReq: 0,
    errors_req: 0,
    errors_resp: 0,
    ended_req: 0,
    req_name: '',
    res_status: null,
    res_status_message: null,
    res_time_per_req: 0,
    total_res_time_for_machine: 0,
    total_error_res_time_for_machine: 0,
    total_error_req_time_for_machine: 0,
    first_req_time:new Date().getTime()
};
var loadTimer;
var no_of_round=0;
var maxValue=0;
function collectionInit(){
    utilitiesObj = require('./utility.js');
    MyTestObj=require("./MyTest.js");
    startLoadTimer();
}


function createLoadCyle(controller) {

    stats.inproc++;
     var uniqueName = "User" + Math.random().toString(36).slice(2);
     var myTest=new MyTestObj();
     var executionObj=myTest.executeFunction();
     var array_of_functions=executionObj.array_of_functions;
     console.log("array_of_functions",array_of_functions[0])
     var index = 0;
     function beginLoad() {
        if (index < executionObj.array_of_functions.length) {
            var loadFunction = executionObj.array_of_functions[index].split("(")[0];
            var funcNo = parseInt(executionObj.array_of_functions[index].split("(")[1].split(")")[0]);
             console.log("controller.requestNumber",controller.requestNumber,"funcNo",funcNo)
           if(controller.requestNumber % funcNo==0) {
            if(loadFunction=="createUser"){
                beforeEachRequest("")
                myTest[loadFunction](uniqueName,requestStats,function(){
                    //console.log("user created")
                    ++index;
                    if(index==executionObj.array_of_functions.length){
                        stats.inproc--;
                    }
                    beginLoad();
                });
            }else{
                beforeEachRequest("")
                myTest[loadFunction](requestStats,function(){
                   // console.log("user created")
                    ++index;
                    if(index==executionObj.array_of_functions.length){
                        stats.inproc--;
                    }
                    beginLoad();
                });
            }
           }else{
               ++index;
               if(index==executionObj.array_of_functions.length){
                   stats.inproc--;
               }
               beginLoad();
           }
        }
    }
    beginLoad();

}
function startLoadTimer(){
     loadTimer = setInterval(function () {

        while (config.n > requestStats.clients + stats.inproc && stats.inproc < config.concurrency) {
            requestNumber++;
            var controller = new Object();
            controller.requestNumber = requestNumber;
            createLoadCyle(controller);

        }
    }, 500);

}

function beforeEachRequest(reqName) {
    requestStats.inprocReq++;
    //requestStats.req_name = reqName;
}
http.createServer(function (req, res) {
    if (req.method === "GET") {
        var url = require('url').parse(req.url, true);
        if (url.pathname === '/') {
            // Return stats on '/'
            return res.end(JSON.stringify(requestStats) + "\n");

        }else if (url.pathname === '/set') {
            var queryUrl = url.query;
            if(queryUrl.n)
                config.n = queryUrl.n;
            config.concurrency = queryUrl.c;
            return res.end(JSON.stringify(config) + "\n");
        }
        else if (url.pathname === '/restart') {
            // Restart process on '/restart'
            require('child_process').exec("sudo restart client", function() {});
            return res.end("OK\n");
        }
    }
    res.writeHead(404);
    res.end();
}).listen(8080);
