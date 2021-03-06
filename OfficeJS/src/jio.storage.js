
// Adds 3 storages to JIO
// type:
//     - local
//     - dav
//     - replicate
(function () {
var jio_storage_loader = function ( LocalOrCookieStorage, Base64, Jio, $) {

    ////////////////////////////////////////////////////////////////////////////
    // Tools
    var checkJioDependencies = function() {
        var retval = true,
        err = function (name) {
            console.error ('Fail to load ' + name);
            retval = false;
        };
        try { if (!Base64) { err('Base64'); } }
        catch (e) { err('Base64'); }
        return retval;
    },
    // end Tools
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // Classes
    LocalStorage,DAVStorage,ReplicateStorage;
    // end Classes
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // Local Storage
    LocalStorage = function ( args ) {
        // LocalStorage constructor

        var that = Jio.newBaseStorage( args ), priv = {};

        that.checkNameAvailability = function () {
            // checks the availability of the [job.userName].
            // if the name already exists, it is not available.
            // this.job.userName: the name we want to check.

            // wait a little in order to simulate asynchronous operation
            setTimeout(function () {
                var localStorageObject = null;

                localStorageObject = LocalOrCookieStorage.getAll();
                for (var k in localStorageObject) {
                    var splitk = k.split('/');
                    if (splitk[0] === 'jio' &&
                        splitk[1] === 'local' &&
                        splitk[2] === that.getUserName()) {
                        return that.done(false);
                    }
                }
                return that.done(true);
            }, 100);
        }; // end checkNameAvailability

        that.saveDocument = function () {
            // Save a document in the local storage
            // this.job.fileName: the document name.
            // this.job.fileContent: the document content.
            // this.job.storage: the storage information.
            // this.job.storage.userName: the user name
            // this.job.applicant.ID: the applicant id.

            // wait a little in order to simulate asynchronous saving
            setTimeout (function () {
                var doc = null;

                // reading
                doc = LocalOrCookieStorage.getItem(
                    'jio/local/'+that.getStorageUserName()+'/'+
                        that.getApplicantID()+'/'+
                        that.getFileName());
                if (!doc) {
                    // create document
                    doc = {
                        'fileName': that.getFileName(),
                        'fileContent': that.getFileContent(),
                        'creationDate': Date.now(),
                        'lastModified': Date.now()
                    };
                } else {
                    // overwriting
                    doc.lastModified = Date.now();
                    doc.fileContent = that.getFileContent();
                }
                LocalOrCookieStorage.setItem(
                    'jio/local/'+that.getStorageUserName()+'/'+
                        that.getApplicantID()+'/'+
                        that.getFileName(), doc);
                return that.done();
            }, 100);
        }; // end saveDocument

        that.loadDocument = function () {
            // Load a document from the storage. It returns a document object
            // containing all information of the document and its content.
            // this.job.fileName : the document name we want to load.
            // this.job.options.getContent: if true, also get the file content.

            // document object is {'fileName':string,'fileContent':string,
            // 'creationDate':date,'lastModified':date}

            // wait a little in order to simulate asynchronous operation
            setTimeout(function () {
                var doc = null, settings = $.extend(
                    {'getContent':true},that.cloneOptionObject());

                doc = LocalOrCookieStorage.getItem(
                    'jio/local/'+that.getStorageUserName()+'/'+
                        that.getApplicantID()+'/'+that.getFileName());
                if (!doc) {
                    that.fail('Document not found.',404);
                } else {
                    if (!settings.getContent) {
                        delete doc.fileContent;
                    }
                    that.done(doc);
                }
            }, 100);
        }; // end loadDocument

        that.getDocumentList = function () {
            // Get a document list from the storage. It returns a document
            // array containing all the user documents informations.
            // this.job.storage: the storage informations.
            // this.job.storage.userName: the userName.
            // this.job.storage.applicant.ID: the applicant ID.

            // the list is [object,object] -> object = {'fileName':string,
            // 'lastModified':date,'creationDate':date}

            setTimeout(function () {
                var list = [], localStorageObject = null, k = 'key',
                splitk = ['splitedkey'], fileObject = {};

                localStorageObject = LocalOrCookieStorage.getAll();
                for (k in localStorageObject) {
                    splitk = k.split('/');
                    if (splitk[0] === 'jio' &&
                        splitk[1] === 'local' &&
                        splitk[2] === that.getStorageUserName() &&
                        splitk[3] === that.getApplicantID()) {
                        fileObject = JSON.parse(localStorageObject[k]);
                        list.push ({
                            'fileName':fileObject.fileName,
                            'creationDate':fileObject.creationDate,
                            'lastModified':fileObject.lastModified});
                    }
                }
                that.done(list);
            }, 100);
        }; // end getDocumentList

        that.removeDocument = function () {
            // Remove a document from the storage.
            // this.job.storage.userName: the userName.
            // this.job.applicant.ID: the applicant ID.
            // this.job.fileName: the document name.

            setTimeout (function () {
                // deleting
                LocalOrCookieStorage.deleteItem(
                    'jio/local/'+
                        that.getStorageUserName()+'/'+
                        that.getApplicantID()+'/'+
                        that.getFileName());
                return that.done();
            }, 100);
        };
        return that;
    };

    // end Local Storage
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // DAVStorage
    DAVStorage = function ( args ) {
        var that = Jio.newBaseStorage( args );

        that.mkcol = function ( options ) {
            // create folders in dav storage, synchronously
            // options : contains mkcol list
            // options.location : the davstorage locations
            // options.path: if path=/foo/bar then creates location/dav/foo/bar
            // options.success: the function called if success
            // options.userName: the username
            // options.password: the password

            // TODO this method is not working !!!

            var settings = $.extend ({
                'success':function(){},'error':function(){}},options),
            splitpath = ['splitedpath'], tmppath = 'temp/path';

            // if pathstep is not defined, then split the settings.path
            // and do mkcol recursively
            if (!settings.pathsteps) {
                settings.pathsteps = 1;
                that.mkcol(settings);
            } else {
                splitpath = settings.path.split('/');
                // // check if the path is terminated by '/'
                // if (splitpath[splitpath.length-1] == '') {
                //     splitpath.length --;
                // }
                // check if the pathstep is lower than the longer
                if (settings.pathsteps >= splitpath.length-1) {
                    return settings.success();
                }
                splitpath.length = settings.pathsteps + 1;
                settings.pathsteps++;
                tmppath = splitpath.join('/');
                // alert(settings.location + tmppath);
                $.ajax ( {
                    url: settings.location + tmppath,
                    type: 'MKCOL',
                    async: true,
                    headers: {'Authorization': 'Basic '+Base64.encode(
                        settings.userName + ':' +
                            settings.password ), Depth: '1'},
                    // xhrFields: {withCredentials: 'true'}, // cross domain
                    success: function () {
                        // done
                        that.mkcol(settings);
                    },
                    error: function (type) {
                        // alert(JSON.stringify(type));
                        // switch (type.status) {
                        // case 405: // Method Not Allowed
                        //     // already exists
                        //     t.mkcol(settings);
                        //     break;
                        // default:
                            settings.error();
                        //     break;
                        // }
                    }
                } );
            }
        };

        that.checkNameAvailability = function () {
            // checks the availability of the [job.userName].
            // if the name already exists, it is not available.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.userName: the name we want to check.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.

            $.ajax ( {
                url: that.getStorageLocation() + '/dav/' +
                    that.getStorageUserName() + '/',
                async: true,
                type: 'PROPFIND',
                dataType: 'xml',
                headers: {'Authorization': 'Basic '+Base64.encode(
                    that.getStorageUserName() + ':' +
                        that.getStoragePassword() ), Depth: '1'},
                success: function (xmlData) {
                    that.done(false);
                },
                error: function (type) {
                    if (type.status === 404) {
                        that.done(true);
                    } else {
                        that.fail('Cannot check if ' + that.getUserName() +
                                  ' is available.',type.status);
                    }
                }
            } );
        };

        that.saveDocument = function () {
            // Save a document in a DAVStorage
            // this.job.storage: the storage informations.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.applicant.ID: the applicant ID.
            // this.job.fileName: the document name.
            // this.job.fileContent: the document content.

            // TODO if path of /dav/user/applic does not exists, it won't work!
            //// save on dav
            $.ajax ( {
                url: that.getStorageLocation() + '/dav/' +
                    that.getStorageUserName() + '/' +
                    that.getApplicantID() + '/' +
                    that.getFileName(),
                type: 'PUT',
                data: that.getFileContent(),
                async: true,
                dataType: 'text', // TODO is it necessary ?
                headers: {'Authorization':'Basic '+Base64.encode(
                    that.getStorageUserName()+':'+that.getStoragePassword())},
                // xhrFields: {withCredentials: 'true'}, // cross domain
                success: function () {
                    that.done();
                },
                error: function (type) {
                    that.fail('Cannot save document.',type.status);
                }
            } );
            //// end saving on dav
        };

        that.loadDocument = function () {
            // Load a document from a DAVStorage. It returns a document object
            // containing all information of the document and its content.
            // this.job.fileName: the document name we want to load.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.options.getContent: if true, also get the file content.

            // document object is {'fileName':string,'fileContent':string,
            // 'creationDate':date,'lastModified':date}

            var doc = {},
            settings = $.extend({'getContent':true},that.cloneOptionObject()),

            // TODO check if job's features are good
            getContent = function () {
                $.ajax ( {
                    url: that.getStorageLocation() + '/dav/' +
                        that.getStorageUserName() + '/' +
                        that.getApplicantID() + '/' +
                        that.getFileName(),
                    type: "GET",
                    async: true,
                    dataType: 'text', // TODO is it necessary ?
                    headers: {'Authorization':'Basic '+Base64.encode(
                        that.getStorageUserName() + ':' +
                            that.getStoragePassword() )},
                    // xhrFields: {withCredentials: 'true'}, // cross domain
                    success: function (content) {
                        doc.fileContent = content;
                        that.done(doc);
                    },
                    error: function (type) {
                        var message;
                        if (type.status === 404) {
                            message = 'Document not found.';
                        } else {
                            message = 'Cannot load "'+that.getFileName()+'".';
                        }
                        that.fail(message,type.status);
                    }
                } );
            };
            // Get properties
            $.ajax ( {
                url: that.getStorageLocation() + '/dav/' +
                    that.getStorageUserName() + '/' +
                    that.getApplicantID() + '/' +
                    that.getFileName(),
                type: "PROPFIND",
                async: true,
                dataType: 'xml',
                headers: {'Authorization':'Basic '+Base64.encode(
                    that.getStorageUserName() + ':' +
                        that.getStoragePassword() )},
                success: function (xmlData) {
                    // doc.lastModified =
                    $(xmlData).find(
                        'lp1\\:getlastmodified, getlastmodified'
                    ).each( function () {
                        doc.lastModified = $(this).text();
                    });
                    $(xmlData).find(
                        'lp1\\:creationdate, creationdate'
                    ).each( function () {
                        doc.creationDate = $(this).text();
                    });
                    doc.fileName = that.getFileName();
                    if (settings.getContent) {
                        getContent();
                    } else {
                        that.done(doc);
                    }
                },
                error: function (type) {
                    that.fail('Cannot get document informations.',type.status);
                }
            } );
        };

        that.getDocumentList = function () {
            // Get a document list from a DAVStorage. It returns a document
            // array containing all the user documents informations.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.applicant.ID: the applicant id.

            // the list is [object,object] -> object = {'fileName':string,
            // 'lastModified':date,'creationDate':date}

            var documentArrayList = [], file = {}, pathArray = [];

            $.ajax ( {
                url: that.getStorageLocation() + '/dav/' +
                    that.getStorageUserName() + '/' +
                    that.getApplicantID() + '/',
                async: true,
                type: 'PROPFIND',
                dataType: 'xml',
                headers: {'Authorization': 'Basic '+Base64.encode(
                    that.getStorageUserName() + ':' +
                        that.getStoragePassword() ), Depth: '1'},
                success: function (xmlData) {
                    $(xmlData).find(
                        'D\\:response, response'
                    ).each( function(i,data){
                        if(i>0) { // exclude parent folder
                            file = {};
                            $(data).find('D\\:href, href').each(function(){
                                pathArray = $(this).text().split('/');
                                file.fileName =
                                    (pathArray[pathArray.length-1] ?
                                     pathArray[pathArray.length-1] :
                                     pathArray[pathArray.length-2]+'/');
                            });
                            if (file.fileName === '.htaccess' ||
                                file.fileName === '.htpasswd') { return; }
                            $(data).find(
                                'lp1\\:getlastmodified, getlastmodified'
                            ).each(function () {
                                file.lastModified = $(this).text();
                            });
                            $(data).find(
                                'lp1\\:creationdate, creationdate'
                            ).each(function () {
                                file.creationDate = $(this).text();
                            });
                            documentArrayList.push (file);
                        }
                    });
                    that.done(documentArrayList);
                },
                error: function (type) {
                    that.fail('Cannot get list.',type.status);
                }
            } );
        };

        that.removeDocument = function () {
            // Remove a document from a DAVStorage.
            // this.job.fileName: the document name we want to remove.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.applicant.ID: the applicant id.

            $.ajax ( {
                url: that.getStorageLocation() + '/dav/' +
                    that.getStorageUserName() + '/' +
                    that.getApplicantID() + '/' +
                    that.getFileName(),
                type: "DELETE",
                async: true,
                headers: {'Authorization':'Basic '+Base64.encode(
                    that.getStorageUserName() + ':' +
                        that.getStoragePassword() )},
                // xhrFields: {withCredentials: 'true'}, // cross domain
                success: function () {
                    that.done();
                },
                error: function (type) {
                    if (type.status === 404) {
                        that.done();
                    } else {
                        that.fail('Cannot remove "' + that.getFileName() +
                                  '".',type.status);
                    }
                }
            } );
        };
        return that;
    };
    // end DAVStorage
    ////////////////////////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////////////////////////
    // ReplicateStorage
    ReplicateStorage = function ( args ) {
        var that = Jio.newBaseStorage( args ), priv = {};

        priv.storageArray = that.getStorageArray();
        // TODO Add a tests that check if there is no duplicate storages.
        priv.length = priv.storageArray.length;
        priv.returnsValuesArray = [];
        priv.maxtries = that.getMaxTries();

        that.setMaxTries (1);

        that.checkNameAvailability = function () {
            // Checks the availability of the [job.userName].
            // if the name already exists in a storage, it is not available.
            // this.job.userName: the name we want to check.
            // this.job.storage.storageArray: An Array of storages.
            // TODO

            var newjob = {}, isavailable = true, i = 'id',
            res = {'status':'done'}, callback = function (result) {
                priv.returnsValuesArray.push(result);
                if (result.status === 'fail') {
                    res.status = 'fail';
                }
                if (!result.isAvailable) { isavailable = false; }
                if (priv.returnsValuesArray.length === priv.length) {
                    // if this is the last callback
                    that.done(isavailable);
                }
            };

            for (i in priv.storageArray) {
                newjob = that.cloneJob();
                newjob.maxtries = priv.maxtries;
                newjob.storage = priv.storageArray[i];
                newjob.callback = callback;
                that.addJob ( newjob ) ;
            }
        };
        that.saveDocument = function () {
            // Save a single document in several storages.
            // If a storage failed to save the document.
            // this.job.storage: the storage informations.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.applicant.ID: the applicant ID.
            // this.job.fileName: the document name.
            // this.job.fileContent: the document content.
            // TODO

            var newjob = {}, res = {'status':'done'}, i = 'id',
            callback = function (result) {
                priv.returnsValuesArray.push(result);
                if (result.status === 'fail') {
                    res.status = 'fail';
                }
                if (priv.returnsValuesArray.length === priv.length) {
                    // if this is the last callback
                    if (res.status === 'fail') {
                        that.fail('Unable to save all files.',0);
                    } else {
                        that.done();
                    }
                }
            };

            for (i in priv.storageArray) {
                newjob = that.cloneJob();
                newjob.maxtries = priv.maxtries;
                newjob.storage = priv.storageArray[i];
                newjob.callback = callback;
                that.addJob ( newjob ) ;
            }
        };

        that.loadDocument = function () {
            // Load a document from several storages. It returns a document
            // object containing all information of the document and its
            // content. TODO will popup a window which will help us to choose
            // the good file if the files are different.
            // this.job.fileName: the document name we want to load.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.options.getContent: if true, also get the file content.

            // document object is {'fileName':string,'fileContent':string,
            // 'creationDate':date,'lastModified':date}
            // TODO

            var newjob = {}, aredifferent = false, doc = {}, i = 'id',
            res = {'status':'done'}, callback = function (result) {
                priv.returnsValuesArray.push(result);
                if (result.status === 'fail') {
                    res.status = 'fail';
                } else {
                    // check if the file are different
                    if (!doc.fileContent && !doc.creationDate &&
                        !doc.lastModified) {
                        // if it is the first document loaded
                        doc = $.extend({},result.document);
                    } else {
                        if (doc.fileContent !==
                            result.document.fileContent) {
                            // if the document is different from the
                            // previous one
                            aredifferent = true;
                        }
                        if (doc.creationDate >
                            result.document.creationDate) {
                            // get older creation date
                            doc.creationDate = result.document.creationDate;
                        }
                        if (doc.lastModified <
                            result.document.lastModified) {
                            // get newer last modified
                            doc.fileContent = result.document.fileContent;
                            doc.lastModified = result.document.lastModified;
                        }
                    }
                }
                if (priv.returnsValuesArray.length === priv.length) {
                    // if this is the last callback
                    if (res.status === 'fail') {
                        that.fail('Unable to load all files.',0);
                    } else {
                        if (!aredifferent) {
                            that.done(doc);
                        } else {
                            // TODO the files are different! Give options
                            // to know what do we do now!
                            // console.warn ('The files are different.');
                            that.done(doc);
                        }
                    }
                }
            };

            for (i in priv.storageArray) {
                newjob = that.cloneJob();
                newjob.maxtries = priv.maxtries;
                newjob.storage = priv.storageArray[i];
                newjob.callback = callback;
                that.addJob ( newjob ) ;
            }
        };

        that.getDocumentList = function () {
            // Get a document list from several storages. It returns a document
            // array containing all the user documents informations.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.applicant.ID: the applicant id.

            // the list is [object,object] -> object = {'fileName':string,
            // 'lastModified':date,'creationDate':date}
            // TODO

            var newjob = {}, res = {'status':'done'}, i = 'id',
            callback = function (result) {
                priv.returnsValuesArray.push(result);
                if (result.status === 'fail') {
                    res.status = 'fail';
                }
                if (priv.returnsValuesArray.length === priv.length) {
                    // if this is the last callback
                    if (res.status === 'fail') {
                        that.fail('Unable retrieve all lists.',0);
                    } else {
                        that.done(result.list);
                    }
                }
            };

            for (i in priv.storageArray) {
                newjob = that.cloneJob();
                newjob.maxtries = priv.maxtries;
                newjob.storage = priv.storageArray[i];
                newjob.callback = callback;
                that.addJob ( newjob ) ;
            }
        };

        that.removeDocument = function () {
            // Remove a document from several storages.
            // this.job.fileName: the document name we want to remove.
            // this.job.storage: the storage informations.
            // this.job.storage.location: the dav storage location.
            // this.job.storage.userName: the user name.
            // this.job.storage.password: the user password.
            // this.job.applicant.ID: the applicant id.
            // TODO

            var newjob = {}, res = {'status':'done'}, i = 'key',
            callback = function (result) {
                priv.returnsValuesArray.push(result);
                if (result.status === 'fail') {
                    res.status = 'fail';
                }
                if (priv.returnsValuesArray.length === priv.length) {
                    // if this is the last callback
                    if (res.status === 'fail') {
                        that.fail('Unable remove all files.',0);
                    } else {
                        that.done();
                    }
                }
            };

            for (i in priv.storageArray) {
                newjob = that.cloneJob();
                newjob.maxtries = priv.maxtries;
                newjob.storage = priv.storageArray[i];
                newjob.callback = callback;
                that.addJob ( newjob ) ;
            }
        };
        return that;
    };
    // end ReplicateStorage
    ////////////////////////////////////////////////////////////////////////////

    // add key to storageObjectType of global jio
    Jio.addStorageType('local', function (options) {
        return new LocalStorage(options);
    });
    Jio.addStorageType('dav', function (options) {
        return new DAVStorage(options);
    });
    Jio.addStorageType('replicate', function (options) {
        return new ReplicateStorage(options);
    });

};

if (window.requirejs) {
    define ('JIOStorages',
            ['LocalOrCookieStorage','Base64','JIO','jQuery'],
            jio_storage_loader);
} else {
    jio_storage_loader ( LocalOrCookieStorage, Base64, JIO, jQuery );
}

}());
