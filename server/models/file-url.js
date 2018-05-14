/**
 * File url model
 */

const sh = require('../../lib/url.js');

module.exports = function Model (we) {
  const _ = we.utils._,
    async = we.utils.async;

  const model = {
    definition: {
      // - user given data text
      label: { type: we.db.Sequelize.STRING },
      description: { type: we.db.Sequelize.TEXT },
      url:  { type: we.db.Sequelize.TEXT },
      mime: { type: we.db.Sequelize.STRING }
    },
    associations: {
      creator: { type: 'belongsTo', model: 'user' }
    },
    options: {
      enableAlias: false
    }
  };

   // after define all models, add url field hooks in models how have urls
  we.hooks.on('we:models:set:joins', sh.addAllUrlsHooks);

  we.events.on('we:after:load:plugins', function (we) {
    if (!we.file) we.file = {};
    if (!we.file.url) we.file.url = {};
    const db = we.db;

    we.file.url.getModelFields = function getModelFields(Model) {
      if (!Model || !Model.options || !Model.options.urlFields) return null;
      return Model.options.urlFields;
    };

    we.file.url.afterFind = function afterFind (r, opts) {
      return new Promise( (resolve, reject)=> {
        const Model = this;

        // skip if is raw query that dont preload need model attrs and methods
        if (opts.raw) return resolve();

        if (_.isArray(r)) {
          async.each(r, (r1, next)=> {
            // we.db.models.urlassoc
            we.file.url.afterFindRecord.bind(Model)(r1, opts, next);
          }, (err)=> {
            if (err) return reject(err);
            resolve();
          });
        } else {
          we.file.url.afterFindRecord.bind(Model)(r, opts, (err)=> {
            if (err) return reject(err);
            resolve();
          });
        }
      });
    };

    we.file.url.afterFindRecord = function afterFindRecord (r, opts, done) {
      const functions = [];
      const Model = this;
      // found 0 results
      if (!r) return done();
      // skip if is raw query that dont preload need model attrs and methods
      if (opts.raw || !r.setDataValue) return done();

      const fields = we.file.url.getModelFields(this);
      if (!fields) return done();

      if (!r._salvedUrls) r._salvedUrls = {};
      if (!r._salvedurlassocs) r._salvedurlassocs = {};

      const fieldNames = Object.keys(fields);
      // for each field
      fieldNames.forEach( (fieldName)=> {
        functions.push( (next)=> {
          return db.models.urlassoc
          .findAll({
            where: {
              modelName: Model.name,
              modelId: r.id,
              field: fieldName
            },
            include: [{ all: true }]
          })
          .then( (urlAssocs)=> {
            if (_.isEmpty(urlAssocs)) {
              next();
              return null;
            }

            r._salvedUrls = urlAssocs.map( (urlAssoc)=> {
              return urlAssoc.url.toJSON();
            });

            r.setDataValue(fieldName, r._salvedUrls);
            // salved terms cache
            r._salvedurlassocs[fieldName] = urlAssocs;
            next();
            return null;
          })
          .catch((err)=> {
            we.log.error(err);
            next();
            return err;
          });
        });
      });

      async.parallel(functions, done);
    };
    // after create one record with url fields
    we.file.url.afterCreatedRecord = function afterCreatedRecord (r, opts) {
      return new Promise( (resolve, reject)=> {
        const functions = [];
        const Model = this;

        // skip if is raw query that dont preload need model attrs and methods
        if (opts.raw || !r.setDataValue) return resolve();

        const fields = we.file.url.getModelFields(this);
        if (!fields) return resolve();

        const urlFields = Object.keys(fields);

        if (!r._salvedUrls) r._salvedUrls = {};
        if (!r._salvedurlassocs) r._salvedurlassocs = {};

        urlFields.forEach( (fieldName)=> {
          let values = r.get(fieldName);
          if (_.isEmpty(values)) return;

          const urlsToSave = [];
          const newurlassocs = [];

          functions.push( (nextField)=> {
            async.each(values,  (value, next)=> {
              if (!value || (value === 'null')) return next();

              // check if the url exists
              db.models['file-url'].findOne({
                where: { id: value.id || value }
              })
              .then( (i)=> {
                if (!i) {
                  next();
                  return null;
                }

                return db.models.urlassoc
                .create({
                  modelName: Model.name,
                  modelId: r.id,
                  field: fieldName,
                  urlId: value.id || value
                })
                .then( (r)=> {
                  we.log.verbose('Url assoc created:', r.id);

                  urlsToSave.push(i);
                  newurlassocs.push(r);

                  next();
                  return null;
                });
              })
              .catch(next);
            }, (err)=> {
              if (err) return nextField(err);

              r._salvedurlassocs[fieldName] = newurlassocs;
              r._salvedUrls[fieldName] = urlsToSave;
              r.setDataValue(fieldName, urlsToSave.map( (im)=> {
                return im.toJSON();
              }));

              nextField();
            });
          });
        });

        async.series(functions, (err)=> {
          if (err) return reject(err);
          resolve();
        });
      });
    };

    // after update one record with url fields
    we.file.url.afterUpdatedRecord = function afterUpdatedRecord (r, opts) {
      return new Promise( (resolve, reject)=> {
        const Model = this;

        // skip if is raw query that dont preload need model attrs and methods
        if (opts.raw || !r.setDataValue) return resolve();

        const fields = we.file.url.getModelFields(this);
        console.log('>>fields>>', fields);

        if (!fields) {
          return resolve();
        }

        const fieldNames = Object.keys(fields);
        async.eachSeries(fieldNames,  (fieldName, nextField)=> {

          console.log('>>opts.fields1>>>', opts.fields);
          console.log('>>opts.fields2>>>', fieldName);

          // check if user want update this field
          if (opts.fields.indexOf(fieldName) === -1) return nextField();

          let urlsToSave = _.clone(r.get(fieldName));
          let newurlassocs = [];
          let newurlassocsIds = [];

          console.log('>>urlsToSave>>>>', urlsToSave);

          async.series([
            function findOrCreateAllAssocs (done) {
              let preloadedUrlsAssocsToSave = [];

              async.each(urlsToSave, (its, next)=> {
                if (_.isEmpty(its) || its === 'null') return next();

                let values = {
                  modelName: Model.name,
                  modelId: r.id,
                  field: fieldName,
                  urlId: its.id || its
                };
                // check if this url exits
                db.models['file-url'].findOne({
                  where: { id: its.id || its }
                })
                .then( (i)=> {
                  if (!i) {
                    done();
                    return null;
                  }

                  console.log('>>>', {
                    where: values, defaults: values
                  });

                  // find of create the assoc
                  return db.models.urlassoc
                  .findOrCreate({
                    where: values, defaults: values
                  })
                  .then( (r)=> {
                    r[0].url = i;
                    preloadedUrlsAssocsToSave.push(r[0]);
                    next();
                    return null;
                  });
                })
                .catch(done);
              }, (err)=> {
                if (err) return done(err);

                urlsToSave = preloadedUrlsAssocsToSave.map( (r)=> {
                  newurlassocsIds.push(r.id);
                  return r.url;
                });

                newurlassocs = preloadedUrlsAssocsToSave;
                done();
              });
            },
            // delete removed url assocs
            function deleteAssocs (done) {
              let query = {
                where: {
                  modelName: Model.name,
                  modelId: r.id,
                  field: fieldName
                }
              };

              if (!_.isEmpty(newurlassocsIds)) {
                query.where.id = { [we.Op.notIn]: newurlassocsIds };
              }

              db.models.urlassoc
              .destroy(query)
              .then( (result)=> {
                we.log.verbose('Result from deleted url assocs: ', result, fieldName, Model.name);
                done();
                return null;
              })
              .catch(done);
            },
            function setRecorValues (done) {
              r._salvedUrls[fieldName] = urlsToSave;
              r._salvedurlassocs[fieldName] = newurlassocs;
              r.setDataValue(fieldName, urlsToSave.map( (im)=> {
                return im.toJSON();
              }));
              done();
            }
          ], nextField);
        }, (err)=> {
          if (err) return reject(err);
          resolve();
        });
      });
    };
    // delete the url associations after delete related model
    we.file.url.afterDeleteRecord = function afterDeleteRecord (r) {
      return new Promise( (resolve, reject)=> {
        const Model = this;

        db.models.urlassoc
        .destroy({
          where: {
            modelName: Model.name,
            modelId: r.id
          }
        })
        .then( (result)=> {
          we.log.debug('Deleted ' + result + ' url assocs from record with id: ' + r.id);
          resolve();
          return null;
        })
        .catch(reject);
      });
    };
  });

  return model;
};
