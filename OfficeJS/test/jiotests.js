(function () { var thisfun = function(loader) {
    var JIO = loader.JIO,
    LocalOrCookieStorage = loader.LocalOrCookieStorage,
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
addFile = function (user,appid,file) {
    var i, l, found = false, filenamearray,
    userarray = LocalOrCookieStorage.getItem('jio/localuserarray') || [];
    for (i = 0, l = userarray.length; i < l; i+= 1) {
        if (userarray[i] === user) { found = true; }
    }
    if (!found) {
        userarray.push(user);
        LocalOrCookieStorage.setItem('jio/localuserarray',userarray);
        LocalOrCookieStorage.setItem('jio/localfilenamearray/'+user+'/'+appid,
                                     [file.fileName]);
    } else {
        filenamearray =
            LocalOrCookieStorage.getItem(
                'jio/localfilenamearray/'+user+'/'+appid) || [];
        filenamearray.push(file.fileName);
        LocalOrCookieStorage.setItem(
            'jio/localfilenamearray/'+user+'/'+appid,
            filenamearray);
        LocalOrCookieStorage.setItem(
            'jio/local/'+user+'/'+appid+'/'+file.fileName,
            file);
    }
    LocalOrCookieStorage.setItem(
        'jio/local/'+user+'/'+appid+'/'+file.fileName,
        file);
},
removeFile = function (user,appid,file) {
    var i, l, newarray = [],
    filenamearray =
        LocalOrCookieStorage.getItem(
            'jio/localfilenamearray/'+user+'/'+appid) || [];
    for (i = 0, l = filenamearray.length; i < l; i+= 1) {
        if (filenamearray[i] !== file.fileName) {
            newarray.push(filenamearray[i]);
        }
    }
    LocalOrCookieStorage.setItem('jio/localfilenamearray/'+user+'/'+appid,
                                 newarray);
    LocalOrCookieStorage.deleteItem(
        'jio/local/'+user+'/'+appid+'/'+file.fileName);
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
    o.jio = JIO.createNew();
    ok ( o.jio, 'a new jio -> 1');

    o.jio2 = JIO.createNew();
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
    o.jio = JIO.createNew();

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
        o.jio[method]({'userName':'Dummy','fileName':'file',
                       'fileContent':'content','callback':o.f,
                       'maxtries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    // All Ok Dummy Storage
    o.jio = JIO.createNew({'type':'dummyallok','userName':'Dummy'},
                          {'ID':'jiotests'});
    mytest('check name availability OK','checkNameAvailability',
           'return_value',true);
    mytest('save document OK','saveDocument','status','done');
    mytest('load document OK','loadDocument','return_value',
           {'fileName':'file','fileContent':'content',
            'lastModified':15000,'creationDate':10000});
    mytest('get document list OK','getDocumentList','return_value',
           [{'fileName':'file','creationDate':10000,'lastModified':15000},
            {'fileName':'memo','creationDate':20000,'lastModified':25000}]);
    mytest('remove document OK','removeDocument','status','done');
    o.jio.stop();

    // All Fail Dummy Storage
    o.jio = JIO.createNew({'type':'dummyallfail','userName':'Dummy'},
                          {'ID':'jiotests'});
    mytest('check name availability FAIL','checkNameAvailability',
           'status','fail');
    mytest('save document FAIL','saveDocument','status','fail');
    mytest('load document FAIL','loadDocument','status','fail');
    mytest('get document list FAIL','getDocumentList','status','fail');
    mytest('remove document FAIL','removeDocument','status','fail');
    o.jio.stop();

    // All Not Found Dummy Storage
    o.jio = JIO.createNew({'type':'dummyallnotfound','userName':'Dummy'},
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

    o.jio = JIO.createNew({'type':'dummyallok','userName':'dummy'},
                          {'ID':'jiotests'});
    id = o.jio.getID();
    o.jio.saveDocument({'fileName':'file','fileContent':'content',
                        'callback':o.f1,'maxtries':1});
    ok(LocalOrCookieStorage.getItem('jio/jobobject/'+id)['1'],
       'job creation');
    clock.tick(10);
    o.jio.removeDocument({'fileName':'file','fileContent':'content',
                          'callback':o.f2,'maxtries':1});
    o.tmp = LocalOrCookieStorage.getItem('jio/jobobject/'+id)['1'];
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

    o.jio = JIO.createNew({'type':'dummyallok','userName':'dummy'},
                          {'ID':'jiotests'});
    id = o.jio.getID();
    o.jio.saveDocument({'fileName':'file','fileContent':'content',
                        'callback':o.f1,'maxtries':1});
    clock.tick(10);
    o.jio.saveDocument({'fileName':'file','fileContent':'content',
                        'callback':o.f2,'maxtries':1});
    deepEqual(LocalOrCookieStorage.getItem(
        'jio/jobobject/'+id)['1'].date,10,
              'The first job date have to be equal to the second job date.');
    clock.tick(500);
    deepEqual([o.f1.calledOnce,o.status],[true,'fail'],
       'callback for the first save request -> result fail');
    ok(o.f2.calledOnce,'second callback is called once');
    o.jio.stop();

});

test ('Simple Job Waiting', function () {
    // Test if the second job doesn't erase the first ongoing one

    var o = {}, clock = this.sandbox.useFakeTimers(), id = 0;
    o.f3 = this.spy(); o.f4 = this.spy();

    o.jio = JIO.createNew({'type':'dummyallok','userName':'dummy'},
                          {'ID':'jiotests'});
    id = o.jio.getID();
    o.jio.saveDocument({'fileName':'file','fileContent':'content',
                        'callback':o.f3,'maxtries':1});
    clock.tick(200);
    o.jio.saveDocument({'fileName':'file','fileContent':'content',
                        'callback':o.f4,'maxtries':1});
    ok(LocalOrCookieStorage.getItem(
        'jio/jobobject/'+id)['2'] &&
       LocalOrCookieStorage.getItem(
           'jio/jobobject/'+id)['1'].status === 'ongoing',
       'The second job must not overwrite the first ongoing one.');
    ok(LocalOrCookieStorage.getItem(
        'jio/jobobject/'+id)['2'].status === 'wait' &&
       LocalOrCookieStorage.getItem(
           'jio/jobobject/'+id)['2'].waitingFor &&
       JSON.stringify (LocalOrCookieStorage.getItem(
           'jio/jobobject/'+id)['2'].waitingFor.jobIdArray) === '["1"]',
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
    o.jio = JIO.createNew({'type':'dummyall3tries','userName':'dummy'},
                          {'ID':'jiotests'});
    o.jio.saveDocument({'fileName':'file','fileContent':'content',
                        'callback':o.f,'maxtries':3});
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
            {'userName':'MrCheckName','callback': o.f,'maxtries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };

    // new jio
    o.jio = JIO.createNew({'type':'local','userName':'noname'},
                          {"ID":'noid'});

    // name must be available
    removeFile ('MrCheckName','jiotests',{fileName:'file'});
    mytest(true);

    // name must be unavailable
    addFile ('MrCheckName','jiotests',{fileName:'file'});
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
            {'fileName':'file','fileContent':'content','callback': o.f,
             'maxtries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        } else {
            // check content
            o.tmp = LocalOrCookieStorage.getItem (
                'jio/local/MrSaveName/jiotests/file');
            o.tmp.lmcd = lmcd(o.tmp.creationDate,o.tmp.lastModified);
            delete o.tmp.lastModified;
            delete o.tmp.creationDate;
            deepEqual (o.tmp,{'fileName':'file','fileContent':'content',
                              'lmcd':true},'check content');
        }
    };

    o.jio = JIO.createNew({'type':'local','userName':'MrSaveName'},
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
            {'fileName':'file','callback': o.f,'maxtries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.createNew({'type':'local','userName':'MrLoadName'},
                          {"ID":'jiotests'});
    // load a non existing file
    LocalOrCookieStorage.deleteItem ('jio/local/MrLoadName/jiotests/file');
    mytest ('status','fail');

    // re-load file after saving it manually
    doc = {'fileName':'file','fileContent':'content',
           'lastModified':1234,'creationDate':1000};
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
            var objectifyDocumentArray = function (array) {
                var obj = {}, k;
                for (k = 0; k < array.length; k+=1) {
                    obj[array[k].fileName] = array[k];
                }
                return obj;
            };
            deepEqual (objectifyDocumentArray(result.return_value),
                       objectifyDocumentArray(value),'getting list');
        };
        t.spy(o,'f');
        o.jio.getDocumentList({'callback': o.f,'maxtries':1});
        clock.tick(510);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.createNew({'type':'local','userName':'MrListName'},
                          {"ID":'jiotests'});
    doc1 = {'fileName':'file','fileContent':'content',
            'lastModified':1,'creationDate':0};
    doc2 = {'fileName':'memo','fileContent':'test',
            'lastModified':5,'creationDate':2};
    addFile ('MrListName','jiotests',doc1);
    addFile ('MrListName','jiotests',doc2);
    delete doc1.fileContent;
    delete doc2.fileContent;
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
            {'fileName':'file','callback': o.f,'maxtries':1});
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
    o.jio = JIO.createNew({'type':'local','userName':'MrRemoveName'},
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
        o.jio.checkNameAvailability({'userName':'davcheck','callback':o.f,
                                     'maxtries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };

    o.jio = JIO.createNew({'type':'dav','userName':'davcheck',
                           'password':'checkpwd',
                           'location':'https://ca-davstorage:8080'},
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
        o.jio.loadDocument({'fileName':'file','callback':o.f,'maxtries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.createNew({'type':'dav','userName':'davload',
                           'password':'checkpwd',
                           'location':'https://ca-davstorage:8080'},
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
    mytest ('load document',{'fileName':'file','fileContent':'content',
                             'lastModified':1335953199000,
                             'creationDate':1335953202000},207,200);
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
        o.jio.saveDocument({'fileName':'file','fileContent':'content',
                            'callback':o.f,'maxtries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.createNew({'type':'dav','userName':'davsave',
                           'password':'checkpwd',
                           'location':'https://ca-davstorage:8080'},
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
            var objectifyDocumentArray = function (array) {
                var obj = {}, k;
                for (k = 0; k < array.length; k += 1) {
                    obj[array[k].fileName] = array[k];
                }
                return obj;
            };
            if (result.status === 'fail') {
                deepEqual (result.return_value, value, message);
            } else {
                deepEqual (objectifyDocumentArray(result.return_value),
                           objectifyDocumentArray(value),message);
            }
        };
        t.spy(o,'f');
        o.jio.getDocumentList({'callback':o.f,'maxtries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.createNew({'type':'dav','userName':'davlist',
                           'password':'checkpwd',
                           'location':'https://ca-davstorage:8080'},
                          {'ID':'jiotests'});
    mytest('fail to get list',undefined,404);
    mytest('getting list',[{'fileName':'file','creationDate':1335962911000,
                            'lastModified':1335962907000},
                           {'fileName':'memo','creationDate':1335894073000,
                            'lastModified':1335955713000}],207);
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
        o.jio.removeDocument({'fileName':'file','callback':o.f,'maxtries':1});
        clock.tick(500);
        server.respond();
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio = JIO.createNew({'type':'dav','userName':'davremove',
                           'password':'checkpwd',
                           'location':'https://ca-davstorage:8080'},
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
        o.jio.checkNameAvailability({'userName':'Dummy','callback':o.f,
                                     'maxtries':o.maxtries});
        clock.tick(300000);
        if (!o.f.calledOnce) {
            ok(false,'no respose / too much results');
        }
    };
    o.maxtries = 1;
    // DummyStorageAllOK,OK
    o.jio = JIO.createNew({'type':'replicate','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyallok','userName':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllOK,OK : name available',true);
    o.jio.stop();
    // DummyStorageAllOK,Fail
    o.jio = JIO.createNew({'type':'replicate','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyallfail','userName':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllOK,Fail : name not available',undefined);
    o.jio.stop();
    // DummyStorageAllFail,OK
    o.jio = JIO.createNew({'type':'replicate','storageArray':[
        {'type':'dummyallfail','userName':'1'},
        {'type':'dummyallok','userName':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllFail,OK : name not available',undefined);
    o.jio.stop();
    // DummyStorageAllFail,Fail
    o.jio = JIO.createNew({'type':'replicate','storageArray':[
        {'type':'dummyallfail','userName':'1'},
        {'type':'dummyallfail','userName':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllFail,Fail : fail to check name',undefined);
    o.jio.stop();
    // DummyStorageAllOK,3Tries
    o.maxtries = 3 ;
    o.jio = JIO.createNew({'type':'replicate','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyall3tries','userName':'2'}]},
                          {'ID':'jiotests'});
    mytest('DummyStoragesAllOK,3Tries : name available',true);
    o.jio.stop();
    // DummyStorageAll{3tries,{3tries,3tries},3tries}
    o.maxtries = 3 ;
    o.jio = JIO.createNew({'type':'replicate','storageArray':[
        {'type':'dummyall3tries','userName':'1'},
        {'type':'replicate','storageArray':[
            {'type':'dummyall3tries','userName':'2'},
            {'type':'dummyall3tries','userName':'3'}]},
        {'type':'dummyall3tries','userName':'4'}]},
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
        o.jio.loadDocument({'fileName':'file','callback':o.f});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.createNew({'type':'replicate','userName':'Dummy','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyallok','userName':'2'}]},
                        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,OK: load same file',{
        'fileName':'file','fileContent':'content',
        'lastModified':15000,
        'creationDate':10000});
    o.jio.stop();
    o.jio=JIO.createNew({'type':'replicate','userName':'Dummy','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyall3tries','userName':'2'}]},
                        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,3tries: load 2 different files',{
        'fileName':'file','fileContent':'content',
        'lastModified':15000,
        'creationDate':10000});

    o.jio.stop();
});

test ('Document save', function () {
    // Test if ReplicateStorage can save several documents.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            deepEqual (result.status,value,message);};
        t.spy(o,'f');
        o.jio.saveDocument({'fileName':'file','fileContent':'content',
                            'callback':o.f,'maxtries':3});
        clock.tick(500);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.createNew({'type':'replicate','userName':'Dummy','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyallok','userName':'2'}]},
        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,OK: save a file.','done');
    o.jio.stop();
});

test ('Get Document List', function () {
    // Test if ReplicateStorage can get several list.

    var o = {}, clock = this.sandbox.useFakeTimers(), t = this,
    mytest = function (message,value) {
        o.f = function (result) {
            var objectifyDocumentArray = function (array) {
                var obj = {}, k;
                for (k = 0; k < array.length; k += 1) {
                    obj[array[k].fileName] = array[k];
                }
                return obj;
            };
            deepEqual (objectifyDocumentArray(result.return_value),
                       objectifyDocumentArray(value),'getting list');
        };
        t.spy(o,'f');
        o.jio.getDocumentList({'callback':o.f,'maxtries':3});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.createNew({'type':'replicate','userName':'Dummy','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyall3tries','userName':'2'}]},
        {'ID':'jiotests'});
    o.doc1 = {'fileName':'file',
              'lastModified':15000,'creationDate':10000};
    o.doc2 = {'fileName':'memo',
              'lastModified':25000,'creationDate':20000};
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
        o.jio.removeDocument({'fileName':'file','callback':o.f,'maxtries':3});
        clock.tick(100000);
        if (!o.f.calledOnce) {
            ok(false, 'no response / too much results');
        }
    };
    o.jio=JIO.createNew({'type':'replicate','userName':'Dummy','storageArray':[
        {'type':'dummyallok','userName':'1'},
        {'type':'dummyall3tries','userName':'2'}]},
        {'ID':'jiotests'});
    mytest('DummyStorageAllOK,3tries: remove document.','done');
    o.jio.stop();
});
// end require
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
            JIOStorages: '../src/jio.storage'
        }
    });
    require(['jiotestsloader'],thisfun);
} else {
    thisfun ({LocalOrCookieStorage:LocalOrCookieStorage,
              JIO:JIO,
              Base64:Base64,
              jQuery:jQuery});
}

}());
