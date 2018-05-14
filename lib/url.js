module.exports = {
  addAllUrlsHooks(we, done) {
    const models = we.db.models;
    const url = we.file.url;
    const _ = we.utils._;

    for (let modelName in models) {
      let urlFields = url.getModelFields(
        we.db.modelsConfigs[modelName]
      );

      if (_.isEmpty(urlFields)) continue;

      let model = models[modelName];

      model.addHook('afterFind', 'loadUrls', url.afterFind);
      model.addHook('afterCreate', 'createUrl', url.afterCreatedRecord);
      model.addHook('afterUpdate', 'updateUrl', url.afterUpdatedRecord);
      model.addHook('afterDestroy', 'destroyUrl', url.afterDeleteRecord);
    }

    done();
  }
};