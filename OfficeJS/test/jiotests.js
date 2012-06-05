(function () { var thisfun = function(loader) {
    var JIO = loader.JIO,
    LocalOrCookieStorage = loader.LocalOrCookieStorage,
    sjcl = loader.sjcl,
    Base64 = loader.Base64,
    $ = loader.jQuery;

//// clear jio localstorage
(function () {
    var k, storageObject = LocalOrCookieStorage.getAll();
    for (k in storageObject) {
        var splitk = k.split('/');
        if ( splitk[0] === 'jio' ) {
            LocalOrCookieStorage.deleteItem(k);
        }
    }
}());
//// end clear jio localstorage

//// Tools
var getXML = function (url) {
    var tmp = '';
    $.ajax({'url':url,async:false,
            dataType:'text',success:function(xml){tmp=xml;}});
    return tmp;
},
objectifyDocumentArray = function (array) {
    var obj = {}, k;
    for (k = 0; k < array.length; k += 1) {
        obj[array[k].name] = array[k];
    }
    return obj;
},
addFile = function (user,appid,file) {
    var i, l, found = false, filenamearray,
    userarray = LocalOrCookieStorage.getItem('jio/local_user_array') || [];
    for (i = 0, l = userarray.length; i < l; i+= 1) {
        if (userarray[i] === user) { found = true; }
    }
    if (!found) {
        userarray.push(user);
        LocalOrCookieStorage.setItem('jio/local_user_array',userarray);
        LocalOrCookieStorage.setItem(
            'jio/local_file_name_array/'+user+'/'+appid,[file.name]);
    } else {
        filenamearray =
            LocalOrCookieStorage.getItem(
                'jio/local_file_name_array/'+user+'/'+appid) || [];
        filenamearray.push(file.name);
        LocalOrCookieStorage.setItem(
            'jio/local_file_name_array/'+user+'/'+appid,
            filenamearray);
        LocalOrCookieStorage.setItem(
            'jio/local/'+user+'/'+appid+'/'+file.name,
            file);
    }
    LocalOrCookieStorage.setItem(
        'jio/local/'+user+'/'+appid+'/'+file.name,
        file);
},
removeFile = function (user,appid,file) {
    var i, l, newarray = [],
    filenamearray =
        LocalOrCookieStorage.getItem(
            'jio/local_file_name_array/'+user+'/'+appid) || [];
    for (i = 0, l = filenamearray.length; i < l; i+= 1) {
        if (filenamearray[i] !== file.name) {
            newarray.push(filenamearray[i]);
        }
    }
    LocalOrCookieStorage.setItem('jio/local_file_name_array/'+user+'/'+appid,
                                 newarray);
    LocalOrCookieStorage.deleteItem(
        'jio/local/'+user+'/'+appid+'/'+file.name);
};
//// end tools

//// QUnit Tests ////

module ('Jio Global tests');

test ( "Jio simple methods", function () {
    // Test Jio simple methods
    // It checks if we can create several instance of jio at the same
    // time. Checks if they don't overlap informations, if they are
    // started and stopped correctly and if they are ready when they
    // have to be ready.

    var o = {};
    o.jio = JIO.newJio();
    ok ( o.jio, 'a new jio -> 1');

    o.jio2 = JIO.newJio();
    ok ( o.jio2, 'another new jio -> 2');

    ok ( JIO.addStorageType('qunit', function(){}) ,
         "adding storage type.");

    deepEqual ( o.jio.isReady(), true, '1 must be not ready');

    ok ( o.jio2.getID() !== o.jio.getID(), '1 and 2 must be different');

    deepEqual ( o.jio.stop(), true, '1 must be stopped');

    o.jio2.stop();

});

test ( 'Jio Publish/Sububscribe/Unsubscribe methods', function () {
    // Test the Publisher, Subscriber of a single jio.
    // It is just testing if these function are working correctly.
    // The test publishes an event, waits a little, and check if the
    // event has been received by the callback of the previous
    // subscribe. Then, the test unsubscribe the callback function from
    // the event, and publish the same event. If it receives the event,
    // the unsubscribe method is not working correctly.

    var o = {};
    o.jio = JIO.newJio();

    var spy1 = this.spy();

    // Subscribe the pubsub_test event.
    o.callback = o.jio.subscribe('pubsub_test',spy1);
    // And publish the event.
    o.jio.publish('pubsub_test');
    ok (spy1.calledOnce, 'subscribing & publishing, event called once');

    o.jio.unsubscribe('pubsub_test',spy1);
    o.jio.publish('pubsub_test');
    ok (spy1.calledOnce, 'unsubscribing, same event not called twice');

    o.jio.stop();
});

module ( 'Jio Dummy Storages' );

test ('All tests', function () {
    // Tests all dummy storages from jio.dummystorages.js
    // It is simple tests, but they will be used by replicate storage later
    // for sync operation.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,method,retmethod,value){
        o.f = function (result) {
            deepEqual (result[retmethod],value,message);};
        t.spy(o,'f');
        o.jio[method]({'user_name':'Dummy','name':'file',
                       'content':'content','callback':o.f,
                       'max_tries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    // All Ok Dummy Storage
    o.jio = JIO.newJio({'type':'dummyallok','user_name':'Dummy'},
                          {'ID':'jiotests'});
    mytest('check name availability OK','checkNameAvailability',
           'return_value',true);
    mytest('save document OK','saveDocument','status','done');
    mytest('load document OK','loadDocument','return_value',
           {'name':'file','content':'content',
            'last_modified':15000,'creation_date':10000});
    mytest('get document list OK','getDocumentList','return_value',
           [{'name':'file','creation_date':10000,'last_modified':15000},
            {'name':'memo','creation_date':20000,'last_modified':25000}]);
    mytest('remove document OK','removeDocument','status','done');
    o.jio.stop();

    // All Fail Dummy Storage
    o.jio = JIO.newJio({'type':'dummyallfail','user_name':'Dummy'},
                          {'ID':'jiotests'});
    mytest('check name availability FAIL','checkNameAvailability',
           'status','fail');
    mytest('save document FAIL','saveDocument','status','fail');
    mytest('load document FAIL','loadDocument','status','fail');
    mytest('get document list FAIL','getDocumentList','status','fail');
    mytest('remove document FAIL','removeDocument','status','fail');
    o.jio.stop();

    // All Not Found Dummy Storage
    o.jio = JIO.newJio({'type':'dummyallnotfound','user_name':'Dummy'},
                          {'ID':'jiotests'});
    mytest('check name availability NOT FOUND','checkNameAvailability',
           'return_value',true);
    mytest('save document NOT FOUND','saveDocument','status','done');
    mytest('load document NOT FOUND','loadDocument','status','fail');
    mytest('get document list NOT FOUND','getDocumentList','status','fail');
    mytest('remove document NOT FOUND','removeDocument','status','done');
    o.jio.stop();
});

module ( 'Jio Job Managing' );

test ('Simple Job Elimination', function () {
    var o = {}, clock = this.sandbox.useFakeTimers(), id = 0;
    o.f1 = this.spy(); o.f2 = this.spy();

    o.jio = JIO.newJio({'type':'dummyallok','user_name':'dummy'},
                          {'ID':'jiotests'});
    id = o.jio.getID();
    o.jio.saveDocument({'name':'file','content':'content',
                        'callback':o.f1,'max_tries':1});
    ok(LocalOrCookieStorage.getItem('jio/job_object/'+id)['1'],
       'job creation');
    clock.tick(10);
    o.jio.removeDocument({'name':'file','content':'content',
                          'callback':o.f2,'max_tries':1});
    o.tmp = LocalOrCookieStorage.getItem('jio/job_object/'+id)['1'];
    ok(!o.tmp || o.tmp.status === 'fail','job elimination');
});

test ('Simple Job Replacement', function () {
    // Test if the second job write over the first one

    var o = {}, clock = this.sandbox.useFakeTimers(), id = 0;
    o.f1 = function (result) {
        o.status = result.status;
    };
    this.spy(o,'f1');
    o.f2 = this.spy();

    o.jio = JIO.newJio({'type':'dummyallok','user_name':'dummy'},
                          {'ID':'jiotests'});
    id = o.jio.getID();
    o.jio.saveDocument({'name':'file','content':'content',
                        'callback':o.f1,'max_tries':1});
    clock.tick(10);
    o.jio.saveDocument({'name':'file','content':'content',
                        'callback':o.f2,'max_tries':1});
    deepEqual(LocalOrCookieStorage.getItem(
        'jio/job_object/'+id)['1'].date,10,
              'The first job date have to be equal to the second job date.');
    clock.tick(500);
    deepEqual([o.f1.calledOnce,o.status],[true,'fail'],
       'callback for the first save request -> result fail');
    ok(o.f2.calledOnce,'second callback is called once');
    o.jio.stop();

});

test ('Simple Job Waiting', function () {
    // Test if the second job doesn't erase the first on going one

    var o = {}, clock = this.sandbox.useFakeTimers(), id = 0;
    o.f3 = this.spy(); o.f4 = this.spy();

    o.jio = JIO.newJio({'type':'dummyallok','user_name':'dummy'},
                          {'ID':'jiotests'});
    id = o.jio.getID();
    o.jio.saveDocument({'name':'file','content':'content',
                        'callback':o.f3,'max_tries':1});
    clock.tick(200);
    o.jio.saveDocument({'name':'file','content':'content',
                        'callback':o.f4,'max_tries':1});
    ok(LocalOrCookieStorage.getItem(
        'jio/job_object/'+id)['2'] &&
       LocalOrCookieStorage.getItem(
           'jio/job_object/'+id)['1'].status === 'on_going',
       'The second job must not overwrite the first on going one.');
    ok(LocalOrCookieStorage.getItem(
        'jio/job_object/'+id)['2'].status === 'wait' &&
       LocalOrCookieStorage.getItem(
           'jio/job_object/'+id)['2'].waiting_for &&
       JSON.stringify (LocalOrCookieStorage.getItem(
           'jio/job_object/'+id)['2'].waiting_for.job_id_array) === '["1"]',
       'The second job must be waiting for the first to end');
    clock.tick(500);
    ok(o.f3.calledOnce,'first request passed');
    ok(o.f4.calledOnce,'restore waiting job');
    o.jio.stop();
});

test ('Simple Time Waiting' , function () {
    // Test if the job that have fail wait until a certain moment to restart.
    // It will use the dummyall3tries, which will work after the 3rd try.

    var o = {}, clock = this.sandbox.useFakeTimers(), id = 0;
    o.f = function (result) {
        o.res = (result.status === 'done');
    };
    this.spy(o,'f');
    o.jio = JIO.newJio({'type':'dummyall3tries','user_name':'dummy'},
                          {'ID':'jiotests'});
    o.jio.saveDocument({'name':'file','content':'content',
                        'callback':o.f,'max_tries':3});
    clock.tick(100000);
    ok(o.f.calledOnce,'callback called once.');
    ok(o.res,'job done.');
    o.jio.stop();
});

module ( 'Jio LocalStorage' );

test ('Check name availability', function () {
    // Test if LocalStorage can check the availabality of a name.
    // We remove MrCheckName from local storage, and checking must return true.
    // We now add MrCheckName to local storage, and checking must return false.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (value){
        o.f = function (result) {
            deepEqual(result.return_value,value,'checking name availabality');};
        t.spy(o,'f');
        o.jio.checkNameAvailability(
            {'user_name':'MrCheckName','callback': o.f,'max_tries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };

    // new jio
    o.jio = JIO.newJio({'type':'local','user_name':'noname'},
                          {"ID":'noid'});

    // name must be available
    removeFile ('MrCheckName','jiotests',{name:'file'});
    mytest(true);

    // name must be unavailable
    addFile ('MrCheckName','jiotests',{name:'file'});
    mytest(false);

    o.jio.stop();
});

test ('Document save', function () {
    // Test if LocalStorage can save documents.
    // We launch a saving to localstorage and we check if the file is
    // realy saved. Then save again and check if

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value,lmcd){
        o.f = function (result) {
            deepEqual(result.status,value,message);};
        t.spy(o,'f');
        o.jio.saveDocument(
            {'name':'file','content':'content','callback': o.f,
             'max_tries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        } else {
            // check content
            o.tmp = LocalOrCookieStorage.getItem (
                'jio/local/MrSaveName/jiotests/file');
            o.tmp.lmcd = lmcd(o.tmp.creation_date,o.tmp.last_modified);
            delete o.tmp.last_modified;
            delete o.tmp.creation_date;
            deepEqual (o.tmp,{'name':'file','content':'content',
                              'lmcd':true},'check content');
        }
    };

    o.jio = JIO.newJio({'type':'local','user_name':'MrSaveName'},
                          {"ID":'jiotests'});
    LocalOrCookieStorage.deleteItem ('jio/local/MrSaveName/jiotests/file');
    // save and check document existence
    clock.tick(200);
    // message, value, fun ( creationdate, lastmodified )
    mytest('saving document','done',function(cd,lm){
        return (cd === lm);
    });

    // re-save and check modification date
    mytest('saving again','done',function(cd,lm){
        return (cd < lm);
    });

    o.jio.stop();
});

test ('Document load', function () {
    // Test if LocalStorage can load documents.
    // We launch a loading from localstorage and we check if the file is
    // realy loaded.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    doc = {},
    mytest = function (res,value){
        o.f = function (result) {
            deepEqual(result[res],value,'loading document');};
        t.spy(o,'f');
        o.jio.loadDocument(
            {'name':'file','callback': o.f,'max_tries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.newJio({'type':'local','user_name':'MrLoadName'},
                          {"ID":'jiotests'});
    // load a non existing file
    LocalOrCookieStorage.deleteItem ('jio/local/MrLoadName/jiotests/file');
    mytest ('status','fail');

    // re-load file after saving it manually
    doc = {'name':'file','content':'content',
           'last_modified':1234,'creation_date':1000};
    LocalOrCookieStorage.setItem (
        'jio/local_file_name_array/MrLoadName/jiotests',['file']);
    LocalOrCookieStorage.setItem ('jio/local/MrLoadName/jiotests/file',doc);
    mytest ('return_value',doc);

    o.jio.stop();
});

test ('Get document list', function () {
    // Test if LocalStorage can get a list of documents.
    // We create 2 documents inside localStorage to check them.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    doc1 = {}, doc2 = {},
    mytest = function (value){
        o.f = function (result) {
            deepEqual (objectifyDocumentArray(result.return_value),
                       objectifyDocumentArray(value),'getting list');
        };
        t.spy(o,'f');
        o.jio.getDocumentList({'callback': o.f,'max_tries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.newJio({'type':'local','user_name':'MrListName'},
                          {"ID":'jiotests'});
    doc1 = {'name':'file','content':'content',
            'last_modified':1,'creation_date':0};
    doc2 = {'name':'memo','content':'test',
            'last_modified':5,'creation_date':2};
    addFile ('MrListName','jiotests',doc1);
    addFile ('MrListName','jiotests',doc2);
    delete doc1.content;
    delete doc2.content;
    mytest ([doc1,doc2]);

    o.jio.stop();
});

test ('Document remove', function () {
    // Test if LocalStorage can remove documents.
    // We launch a remove from localstorage and we check if the file is
    // realy removed.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (){
        o.f = function (result) {
            deepEqual(result.status,'done','removing document');};
        t.spy(o,'f');
        o.jio.removeDocument(
            {'name':'file','callback': o.f,'max_tries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        } else {
            // check if the file is still there
            o.tmp = LocalOrCookieStorage.getItem (
                'jio/local/MrRemoveName/jiotests/file');
            ok (!o.tmp, 'check no content');
        }
    };
    o.jio = JIO.newJio({'type':'local','user_name':'MrRemoveName'},
                          {"ID":'jiotests'});
    // test removing a file
    LocalOrCookieStorage.setItem ('jio/local/MrRemoveName/jiotests/file',{});
    mytest ();

    o.jio.stop();
});

module ('Jio DAVStorage');

test ('Check name availability', function () {
    // Test if DavStorage can check the availabality of a name.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (method,value,errno) {
        var server = t.sandbox.useFakeServer();
        server.respondWith ("PROPFIND",
                            "https://ca-davstorage:8080/dav/davcheck/",
                            [errno, {'Content-Type': 'text/xml' },
                             '']);
        o.f = function (result) {
            deepEqual(result[method],value,'checking name availability');};
        t.spy(o,'f');
        o.jio.checkNameAvailability({'user_name':'davcheck','callback':o.f,
                                     'max_tries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };

    o.jio = JIO.newJio({'type':'dav','user_name':'davcheck',
                           'password':'checkpwd',
                           'url':'https://ca-davstorage:8080'},
                          {'ID':'jiotests'});
    // 404 error, the name does not exist, name is available.
    mytest ('return_value',true,404);
    // 200 error, responding ok, the name already exists, name is not available.
    mytest ('return_value',false,200);
    // 405 error, random error
    mytest ('status','fail',405);

    o.jio.stop();
});

test ('Document load', function () {
    // Test if DavStorage can load documents.

    var davload = getXML('responsexml/davload'),
    o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,doc,errprop,errget) {
        var server = t.sandbox.useFakeServer();
        server.respondWith (
            "PROPFIND","https://ca-davstorage:8080/dav/davload/jiotests/file",
            [errprop,{'Content-Type':'text/xml; charset="utf-8"'},
             davload]);
        server.respondWith (
            "GET","https://ca-davstorage:8080/dav/davload/jiotests/file",
            [errget,{},'content']);
        o.f = function (result) {
            deepEqual (result.return_value,doc,message);};
        t.spy(o,'f');
        o.jio.loadDocument({'name':'file','callback':o.f,'max_tries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.newJio({'type':'dav','user_name':'davload',
                           'password':'checkpwd',
                           'url':'https://ca-davstorage:8080'},
                          {'ID':'jiotests'});
    // note: http errno:
    //     200 OK
    //     201 Created
    //     204 No Content
    //     207 Multi Status
    //     403 Forbidden
    //     404 Not Found
    // load an inexistant document.
    mytest ('load inexistant document',undefined,404,404);
    // load a document.
    mytest ('load document',{'name':'file','content':'content',
                             'last_modified':1335953199000,
                             'creation_date':1335953202000},207,200);
    o.jio.stop();
});

test ('Document save', function () {
    // Test if DavStorage can save documents.

    var davsave = getXML('responsexml/davsave'),
    o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value,errnoput,errnoprop) {
        var server = t.sandbox.useFakeServer();
        server.respondWith (
            // lastmodified = 7000, creationdate = 5000
            "PROPFIND","https://ca-davstorage:8080/dav/davsave/jiotests/file",
            [errnoprop,{'Content-Type':'text/xml; charset="utf-8"'},
             davsave]);
        server.respondWith (
            "PUT",
            "https://ca-davstorage:8080/dav/davsave/jiotests/file",
            [errnoput, {'Content-Type':'x-www-form-urlencoded'},
             'content']);
        server.respondWith (
            "GET","https://ca-davstorage:8080/dav/davsave/jiotests/file",
            [errnoprop===207?200:errnoprop,{},'content']);
        // server.respondWith ("MKCOL","https://ca-davstorage:8080/dav",
        //                     [200,{},'']);
        // server.respondWith ("MKCOL","https://ca-davstorage:8080/dav/davsave",
        //                     [200,{},'']);
        // server.respondWith ("MKCOL",
        //                    "https://ca-davstorage:8080/dav/davsave/jiotests",
        //                     [200,{},'']);
        o.f = function (result) {
            deepEqual (result.status,value,message);};
        t.spy(o,'f');
        o.jio.saveDocument({'name':'file','content':'content',
                            'callback':o.f,'max_tries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.newJio({'type':'dav','user_name':'davsave',
                           'password':'checkpwd',
                           'url':'https://ca-davstorage:8080'},
                          {'ID':'jiotests'});
    // note: http errno:
    //     200 OK
    //     201 Created
    //     204 No Content
    //     207 Multi Status
    //     403 Forbidden
    //     404 Not Found
    // // the path does not exist, we want to create it, and save the file.
    // mytest('create path if not exists, and create document',
    //        true,201,404);
    // the document does not exist, we want to create it
    mytest('create document','done',201,404);
    clock.tick(8000);
    // the document already exists, we want to overwrite it
    mytest('overwrite document','done',204,207);
    o.jio.stop();
});

test ('Get Document List', function () {
    // Test if DavStorage can get a list a document.

    var davlist = getXML('responsexml/davlist'),
    o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value,errnoprop) {
        var server = t.sandbox.useFakeServer();
        server.respondWith (
            "PROPFIND",'https://ca-davstorage:8080/dav/davlist/jiotests/',
            [errnoprop,{'Content-Type':'text/xml; charset="utf-8"'},
             davlist]);
        o.f = function (result) {
            if (result.status === 'fail') {
                deepEqual (result.return_value, value, message);
            } else {
                deepEqual (objectifyDocumentArray(result.return_value),
                           objectifyDocumentArray(value),message);
            }
        };
        t.spy(o,'f');
        o.jio.getDocumentList({'callback':o.f,'max_tries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.newJio({'type':'dav','user_name':'davlist',
                           'password':'checkpwd',
                           'url':'https://ca-davstorage:8080'},
                          {'ID':'jiotests'});
    mytest('fail to get list',undefined,404);
    mytest('getting list',[{'name':'file','creation_date':1335962911000,
                            'last_modified':1335962907000},
                           {'name':'memo','creation_date':1335894073000,
                            'last_modified':1335955713000}],207);
    o.jio.stop();
});

test ('Remove document', function () {
    // Test if DavStorage can remove documents.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value,errnodel) {
        var server = t.sandbox.useFakeServer();
        server.respondWith (
            "DELETE","https://ca-davstorage:8080/dav/davremove/jiotests/file",
            [errnodel,{},'']);
        o.f = function (result) {
            deepEqual (result.status,value,message);};
        t.spy(o,'f');
        o.jio.removeDocument({'name':'file','callback':o.f,'max_tries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.newJio({'type':'dav','user_name':'davremove',
                           'password':'checkpwd',
                           'url':'https://ca-davstorage:8080'},
                          {'ID':'jiotests'});

    mytest('remove document','done',204);
    mytest('remove an already removed document','done',404);
    o.jio.stop();
});

module ('Jio ReplicateStorage');

test ('Check name availability', function () {
    // Tests the replicate storage
    // method : checkNameAvailability
    // It will test all the possibilities that could cause a server,
    // like synchronisation problem...

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            deepEqual (result.return_value,value,message);
        };
        t.spy(o,'f');
        o.jio.checkNameAvailability({'user_name':'Dummy','callback':o.f,
                                     'max_tries':o.max_tries});
        clock.tick(300000);
        if (!o.f.calledOnce) {
            ok(false,'no respose / too much results');
        }
    };
    o.max_tries = 1;
    // DummyStorageAllOK,OK
    o.jio = JIO.newJio({'type':'replicate','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyallok','user_name':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllOK,OK : name available',true);
    o.jio.stop();
    // DummyStorageAllOK,Fail
    o.jio = JIO.newJio({'type':'replicate','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyallfail','user_name':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllOK,Fail : name not available',undefined);
    o.jio.stop();
    // DummyStorageAllFail,OK
    o.jio = JIO.newJio({'type':'replicate','storage_array':[
        {'type':'dummyallfail','user_name':'1'},
        {'type':'dummyallok','user_name':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllFail,OK : name not available',undefined);
    o.jio.stop();
    // DummyStorageAllFail,Fail
    o.jio = JIO.newJio({'type':'replicate','storage_array':[
        {'type':'dummyallfail','user_name':'1'},
        {'type':'dummyallfail','user_name':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllFail,Fail : fail to check name',undefined);
    o.jio.stop();
    // DummyStorageAllOK,3Tries
    o.max_tries = 3 ;
    o.jio = JIO.newJio({'type':'replicate','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyall3tries','user_name':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllOK,3Tries : name available',true);
    o.jio.stop();
    // DummyStorageAll{3tries,{3tries,3tries},3tries}
    o.max_tries = 3 ;
    o.jio = JIO.newJio({'type':'replicate','storage_array':[
        {'type':'dummyall3tries','user_name':'1'},
        {'type':'replicate','storage_array':[
            {'type':'dummyall3tries','user_name':'2'},
            {'type':'dummyall3tries','user_name':'3'}]},
        {'type':'dummyall3tries','user_name':'4'}]},
                          {'ID':'jiotests'});
    mytest('DummyStorageAll{3tries,{3tries,3tries},3tries} : name available',
           true);
    o.jio.stop();
});

test ('Document load', function () {
    // Test if ReplicateStorage can load several documents.

    var o = {}; var clock = this.sandbox.useFakeTimers(); var t = this;
    var mytest = function (message,doc) {
        o.f = function (result) {
            deepEqual (result.return_value,doc,message);};
        t.spy(o,'f');
        o.jio.loadDocument({'name':'file','callback':o.f});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.newJio({'type':'replicate','user_name':'Dummy','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyallok','user_name':'2'}]},
                        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,OK: load same file',{
        'name':'file','content':'content',
        'last_modified':15000,
        'creation_date':10000});
    o.jio.stop();
    o.jio=JIO.newJio({'type':'replicate','user_name':'Dummy','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyall3tries','user_name':'2'}]},
                        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,3tries: load 2 different files',{
        'name':'file','content':'content',
        'last_modified':15000,
        'creation_date':10000});

    o.jio.stop();
});

test ('Document save', function () {
    // Test if ReplicateStorage can save several documents.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            deepEqual (result.status,value,message);};
        t.spy(o,'f');
        o.jio.saveDocument({'name':'file','content':'content',
                            'callback':o.f,'max_tries':3});
        clock.tick(500);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.newJio({'type':'replicate','user_name':'Dummy','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyallok','user_name':'2'}]},
        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,OK: save a file.','done');
    o.jio.stop();
});

test ('Get Document List', function () {
    // Test if ReplicateStorage can get several list.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            deepEqual (objectifyDocumentArray(result.return_value),
                       objectifyDocumentArray(value),'getting list');
        };
        t.spy(o,'f');
        o.jio.getDocumentList({'callback':o.f,'max_tries':3});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.newJio({'type':'replicate','user_name':'Dummy','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyall3tries','user_name':'2'}]},
        {'ID':'jiotests'});
    o.doc1 = {'name':'file',
              'last_modified':15000,'creation_date':10000};
    o.doc2 = {'name':'memo',
              'last_modified':25000,'creation_date':20000};
    mytest('DummyStorageAllOK,3tries: get document list .',[o.doc1,o.doc2]);
    o.jio.stop();
});

test ('Remove document', function () {
    // Test if ReplicateStorage can remove several documents.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            deepEqual (result.status,value,message);};
        t.spy(o,'f');
        o.jio.removeDocument({'name':'file','callback':o.f,'max_tries':3});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.newJio({'type':'replicate','user_name':'Dummy','storage_array':[
        {'type':'dummyallok','user_name':'1'},
        {'type':'dummyall3tries','user_name':'2'}]},
        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,3tries: remove document.','done');
    o.jio.stop();
});

module ('Jio IndexedStorage');

test ('Check name availability', function () {
    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            deepEqual (result.return_value,value,message);};
        t.spy(o,'f');
        o.jio.checkNameAvailability({user_name:'MrIndexedCheck',
                                     callback:o.f,max_tries:3});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.newJio({type:'indexed',
                         storage:{type:'dummyall3tries',
                                  user_name:'indexedcheck'}},
                        {ID:'jiotests'});
    mytest('dummy ok : name must be available', true);
    o.jio.stop();
});

test ('Document load', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'indexed',
                         storage:{type:'dummyall3tries',
                                  user_name:'indexedload'}},
                        {ID:'jiotests'});
    // loading must take long time with dummyall3tries
    o.f = function () {};
    this.spy(o,'f');
    o.jio.loadDocument({name:'memo',max_tries:3,callback:o.f,
                        options:{metadata_only:true}});
    clock.tick(500);
    ok(!o.f.calledOnce,'Callback must not be called');
    // wait long time too retreive list
    clock.tick(100000);
    // now we can test if the document metadata are loaded faster.
    o.doc = {name:'memo',last_modified:25000,creation_date:20000};
    o.f2 = function (result) {
        deepEqual (result.return_value,o.doc,'Document metadata retrieved');
    };
    this.spy(o,'f2');
    o.jio.loadDocument({name:'memo',max_tries:3,callback:o.f2,
                        options:{metadata_only:true}});
    clock.tick(500);
    if (!o.f2.calledOnce) {
        ok (false, 'no response / too much results');
    }
    // test a simple document loading
    o.doc2 = {name:'file',last_modified:17000,
              creation_date:11000,content:'content2'};
    o.f3 = function (result) {
        deepEqual (result.return_value,o.doc2,'Simple document loading');
    };
    this.spy(o,'f3');
    o.jio.loadDocument({name:'file',max_tries:3,callback:o.f3});
    clock.tick(100000);
    if (!o.f3.calledOnce) {
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

test ('Document save', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'indexed',
                         storage:{type:'dummyall3tries',
                                  user_name:'indexedsave'}},
                        {ID:'jiotests'});
    o.f = function (result) {
        deepEqual (result.status,'done','document save');
    };
    this.spy(o,'f');
    o.jio.saveDocument({name:'file',max_tries:3,callback:o.f});
    clock.tick(100000);
    if (!o.f.calledOnce){
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

test ('Get document list', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'indexed',
                         storage:{type:'dummyall3tries',
                                  user_name:'indexedgetlist'}},
                        {ID:'jiotests'});
    o.doc1 = {name:'file',last_modified:15000,creation_date:10000};
    o.doc2 = {name:'memo',last_modified:25000,creation_date:20000};
    // getting list must take long time with dummyall3tries
    o.f = function () {};
    this.spy(o,'f');
    o.jio.getDocumentList({max_tries:3,callback:o.f});
    clock.tick(500);
    ok(!o.f.calledOnce,'Callback must not be called');
    // wail long time too retreive list
    clock.tick(100000);
    // now we can test if the document list is loaded faster
    o.f2 = function (result) {
        deepEqual (result.return_value,[o.doc1,o.doc2],'get document list');
    };
    this.spy(o,'f2');
    o.jio.getDocumentList({max_tries:3,callback:o.f2});
    clock.tick(500);
    if (!o.f2.calledOnce) {
        ok (false, 'no response / too much results');
    }
});

test ('Remove document', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'indexed',
                         storage:{type:'dummyall3tries',
                                  user_name:'indexedsave'}},
                        {ID:'jiotests'});
    o.f = function (result) {
        deepEqual (result.status,'done','document remove');
    };
    this.spy(o,'f');
    o.jio.removeDocument({name:'file',max_tries:3,callback:o.f});
    clock.tick(100000);
    if (!o.f.calledOnce){
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

module ('Jio CryptedStorage');

test ('Check name availability' , function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'crypted',
                         storage:{type:'local',
                                  user_name:'cryptcheck'}},
                        {ID:'jiotests'});
    o.f = function (result) {
        deepEqual (result.return_value,true,'name must be available');
    };
    this.spy(o,'f');
    o.jio.checkNameAvailability({user_name:'cryptcheck',
                                 max_tries:1,callback:o.f});
    clock.tick(1000);
    if (!o.f.calledOnce) {
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

test ('Document save' , function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'crypted',
                      user_name:'cryptsave',
                      password:'mypwd',
                      storage:{type:'local',
                               user_name:'cryptsavelocal'}},
                     {ID:'jiotests'});
    o.f = function (result) {
        deepEqual (result.status,'done','save ok');
    };
    this.spy(o,'f');
    o.jio.saveDocument({name:'testsave',content:'contentoftest',
                        max_tries:1,callback:o.f});
    clock.tick(1000);
    if (!o.f.calledOnce) {
        ok (false, 'no response / too much results');
    }
    // encrypt 'testsave' with 'cryptsave:mypwd' password
    o.tmp = LocalOrCookieStorage.getItem(
        'jio/local/cryptsavelocal/jiotests/rZx5PJxttlf9QpZER/5x354bfX54QFa1');
    if (o.tmp) {
        delete o.tmp.last_modified;
        delete o.tmp.creation_date;
    }
    deepEqual (o.tmp,
               {name:'rZx5PJxttlf9QpZER/5x354bfX54QFa1',
                content:'upZkPIpitF3QMT/DU5jM3gP0SEbwo1n81rMOfLE'},
               'Check if the document is realy crypted');
    o.jio.stop();
});

test ('Document Load' , function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'crypted',
                      user_name:'cryptload',
                      password:'mypwd',
                      storage:{type:'local',
                               user_name:'cryptloadlocal'}},
                     {ID:'jiotests'});
    o.f = function (result) {
        if (result.status === 'done') {
            deepEqual (result.return_value,
                       {name:'testload',
                        content:'contentoftest',
                        last_modified:500,
                        creation_date:500},
                       'load ok');
        } else {
            ok (false ,'cannot load');
        }
    };
    this.spy(o,'f');
    // encrypt 'testload' with 'cryptload:mypwd' password
    // and 'contentoftest' with 'cryptload:mypwd'
    LocalOrCookieStorage.setItem(
        'jio/local/cryptloadlocal/jiotests/hiG4H80pwkXCCrlLl1X0BD0BfWLZwDUX',
        {name:'mRyQFcUvUKq6tLGUjBo34P3oc2LPxEju',
         content:'kSulH8Qo105dSKHcY2hEBXWXC9b+3PCEFSm1k7k',
         last_modified:500,creation_date:500});
    o.jio.loadDocument({name:'testload',
                        max_tries:1,callback:o.f});
    clock.tick(1000);
    if (!o.f.calledOnce) {
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
    LocalOrCookieStorage.deleteItem(
        'jio/local/cryptloadlocal/jiotests/hiG4H80pwkXCCrlLl1X0BD0BfWLZwDUX');
});

test ('Get Document List', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'crypted',
                      user_name:'cryptgetlist',
                      password:'mypwd',
                      storage:{type:'local',
                               user_name:'cryptgetlistlocal'}},
                     {ID:'jiotests'});
    o.f = function (result) {
        if (result.status === 'done') {
            deepEqual (objectifyDocumentArray(result.return_value),
                       objectifyDocumentArray(o.doc_list),'Getting list');
        } else {
            console.warn (result);
            ok (false, 'Cannot get list');
        }
    };
    this.spy(o,'f');
    o.doc_list = [
        {name:'testgetlist1',last_modified:500,creation_date:200},
        {name:'testgetlist2',last_modified:300,creation_date:300}
    ];
    o.doc_encrypt_list = [
        {name:'541eX0WTMDw7rqIP7Ofxd1nXlPOtejxGnwOzMw',
         content:'/4dBPUdmLolLfUaDxPPrhjRPdA',
         last_modified:500,creation_date:200},
        {name:'541eX0WTMDw7rqIMyJ5tx4YHWSyxJ5UjYvmtqw',
         content:'/4FBALhweuyjxxD53eFQDSm4VA',
         last_modified:300,creation_date:300}
    ];
    // encrypt with 'cryptgetlist:mypwd' as password
    LocalOrCookieStorage.setItem(
        'jio/local_file_name_array/cryptgetlistlocal/jiotests',
        [o.doc_encrypt_list[0].name,o.doc_encrypt_list[1].name]);
    LocalOrCookieStorage.setItem(
        'jio/local/cryptgetlistlocal/jiotests/'+o.doc_encrypt_list[0].name,
        o.doc_encrypt_list[0]);
    LocalOrCookieStorage.setItem(
        'jio/local/cryptgetlistlocal/jiotests/'+o.doc_encrypt_list[1].name,
        o.doc_encrypt_list[1]);
    o.jio.getDocumentList({max_tries:1,callback:o.f});
    clock.tick (2000);
    if (!o.f.calledOnce) {
        ok (false, 'no response / too much results');
    }
    clock.tick(1000);
    o.jio.stop();
});


test ('Remove document', function () {
    var o = {}, clock = this.sandbox.useFakeTimers();
    o.jio=JIO.newJio({type:'crypted',
                      user_name:'cryptremove',
                      password:'mypwd',
                      storage:{type:'local',
                               user_name:'cryptremovelocal'}},
                     {ID:'jiotests'});
    o.f = function (result) {
        deepEqual (result.status,'done','Document remove');
    };
    this.spy(o,'f');
    // encrypt with 'cryptremove:mypwd' as password
    LocalOrCookieStorage.setItem(
        'jio/local_file_name_array/cryptremovelocal/jiotests',
        ["JqCLTjyxQqO9jwfxD/lyfGIX+qA"]);
    LocalOrCookieStorage.setItem(
        'jio/local/cryptremovelocal/jiotests/JqCLTjyxQqO9jwfxD/lyfGIX+qA',
        {"name":"JqCLTjyxQqO9jwfxD/lyfGIX+qA",
         "content":"LKaLZopWgML6IxERqoJ2mUyyO",
         "creation_date":500,
         "last_modified":500});
    o.jio.removeDocument({name:'file',max_tries:1,callback:o.f});
    clock.tick(1000);
    if (!o.f.calledOnce){
        ok (false, 'no response / too much results');
    }
    o.jio.stop();
});

};                              // end thisfun

if (window.requirejs) {
    require.config ({
        paths: {
            jiotestsloader: './jiotests.loader',

            LocalOrCookieStorage: '../lib/jio/localorcookiestorage.min',
            jQueryAPI: '../lib/jquery/jquery',
            jQuery: '../js/jquery.requirejs_module',
            JIO: '../src/jio',
            Base64API: '../lib/base64/base64',
            Base64: '../js/base64.requirejs_module',
            JIODummyStorages: '../src/jio.dummystorages',
            JIOStorages: '../src/jio.storage',
            SJCLAPI:'../lib/sjcl/sjcl.min',
            SJCL:'../js/sjcl.requirejs_module'
        }
    });
    require(['jiotestsloader'],thisfun);
} else {
    thisfun ({LocalOrCookieStorage:LocalOrCookieStorage,
              JIO:JIO,
              sjcl:sjcl,
              Base64:Base64,
              jQuery:jQuery});
}

}());
