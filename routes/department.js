// dependencies
var express = require('express');
var router = express.Router();

var fs = require('fs');

var upload = require('../modules/upload');

var multiparty = require('connect-multiparty');
var multipartyMiddleware = multiparty({
  uploadDir: __dirname + "/../public/img/tmp/"
});

var Q = require('q');

//Helpers
var logger = require('../modules/alice-logger');
var helper = require('../modules/api-helper');

// models
var Department = require('../models/department');
var User = require('../models/user');

var getDepartments = function(req, res, next) {
  try {
    Department.find()
    .then(function(departments) {
      res.send(departments);
    })
    .catch((err) => { helper.handleError(res, err); })
  } catch(err) {
    helper.handleError(res, err);
  }
};

var postDepartment = function(req, res, next) {
  var required = [{
    name: 'name',
    status: true
  }, {
    name: 'teams',
    status: true
  }, {
    name: 'color',
    status: false
  }, {
    name: 'description',
    status: false
  }, {
    name: 'phone',
    status: false
  }, {
    name: 'lead',
    status: false
  }];

  try {
    var params = helper.getParams(required, req);

    Department.createDepartment(params)
    .then((department) => {
      if (req.files) {
        var file = req.files.file;

        upload.departmentLogo(file, department)
        .then(function(result) {
          if (result !== false) {
            res.send(result);
          } else {
            res.send(result);
          }
        });
      } else {
        res.send(department);
      }
    })
    .catch((err) => { helper.handleError(res, err); });
  } catch (err) {
    helper.handleError(res, err);
  }
};

var getDepartment = function(req, res, next) {
  var required = [{
    name: 'id',
    status: true
  }];

  try {
    var params = helper.getParams(required, req);

    Department.findOne({'_id': params.id})
    .then((department) => { res.send(department); })
    .catch((err) => { helper.handleError(res, err); });
  } catch (err) {
    helper.handleError(res, err);
  }
};

var updateDepartment = function(req, res, next) {
  var required = [{
    name: 'name',
    status: true
  }, {
    name: 'teams',
    status: true
  }, {
    name: 'color',
    status: false
  }, {
    name: 'description',
    status: false
  }, {
    name: 'phone',
    status: false
  }, {
    name: 'lead',
    status: false
  }, {
    name: 'id',
    status: true
  }];

  try {
    var params = helper.getParams(required, req);

    Department.findOne({'_id': params.id})
    .then((department) => {
        return User.find({department: department})
        .then((users) => {

          return department.updateDepartment(params)
          .then((department) => {

            var send = function(department) {
              var methods = [];
              users.forEach((user) => {
                user.department = department;
                methods.push(user.save());
              });

              return Q.all(methods)
              .then(() => { res.send(department); });
            };

            if (req.files) {
              var file = req.files.file;

              upload.departmentLogo(file, department)
              .then(function(result) {
                if (result !== false) {
                  send(result);
                } else {
                  send(result);
                }
              });
            } else {
              send(department);
            }

            // var methods = [];
            // users.forEach((user) => {
            //   user.department = department;
            //   methods.push(user.save());
            // });
            //
            // return Q.all(methods)
            // .then(() => { res.send(department); });
          });
        })
        .catch((err) => { helper.handleError(res, err); });
     })
    .catch((err) => { helper.handleError(res, err); });
  } catch (err) {
    helper.handleError(res, err);
  }
};

var deleteDepartment = function(req, res, next) {
  var required = [{
    name: 'id',
    status: true
  }];

  try {
    var params = helper.getParams(required, req);

    Department.findOne({'_id': params.id})
    .then((department) => {
      User.findOne({'department': department})
      .then((user) => {
        if (user) throw new Error('Department used by users');
      })
      .catch((err) => { helper.handleError(res, err); })

      return department.deleteDepartment()
      .then((department) => { res.send(department); });
     })
    .catch((err) => { helper.handleError(res, err); });
  } catch (err) {
    helper.handleError(res, err);
  }
};

router.route('/', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
})
  .get(getDepartments)
  .post(multipartyMiddleware, postDepartment);

router.route('/:id', function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  next();
})
  .get(getDepartment)
  .put(multipartyMiddleware, updateDepartment)
  .delete(deleteDepartment);

module.exports = router;
