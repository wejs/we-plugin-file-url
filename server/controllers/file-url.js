module.exports = {
  saveFileUrl(req, res) {
    if (!req.isAuthenticated) {
      return res.forbidden();
    }

    if (!req.body.url || !req.body.url.trim || !req.body.url.trim()) {
      return res.badRequest('file-url.create.url.is.required');
    }

    const we = req.we;
    const Model = we.db.models['file-url'];

    Model.create({
      creatorId: req.user.id,
      url: req.body.url
    })
    .then( (data)=> {
      res.locals.data = data;
      return res.ok();
    })
    .catch(res.queryError);
  },
  getFormModalContent(req, res) {
    if (!req.we.view) return res.notFound();

    res.send(
      req.we.view.renderTemplate(
        'file-url/form-url-modal-content',
        res.locals.theme,
        res.locals
      )
    );
  },
};