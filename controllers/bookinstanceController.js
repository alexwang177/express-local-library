var BookInstance = require('../models/bookinstance');
var Book = require('../models/book')

var async = require('async')

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res) {
    
    BookInstance.find()
        .populate('book')
        .exec(function(err, list_bookinstance) {
            if(err) return next(err)

            res.render('bookinstance_list', { title: 'Book Instance List', bookinstance_list: list_bookinstance})
        })
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    
    BookInstance.findById(req.params.id)
        .populate('book')
        .exec(function(err, bookinstance) {
            if(err) return next(err)
            
            if(bookinstance == null) {
                var err = new Error('Book copy not found')
                err.status = 404
                return next(err)
            }

            res.render('bookinstance_detail', { title: 'Copy: ' + bookinstance.book.title, bookinstance: bookinstance })
        })
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    
    Book.find({}, 'title')
        .exec(function(err, books) {
            if(err) return next(err)

            res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books })
        })
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    // Validate fields.
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),
    
    // Sanitize fields.
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),

    // Process request after validation and sanitization
    (req, res, next) => {

        // Extract validation errors from request
        const errors = validationResult(req)

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
            { book: req.body.book,
              imprint: req.body.imprint,
              status: req.body.status,
              due_back: req.body.due_back
             })

        console.log(bookinstance.due_back)
        console.log(bookinstance.status)

        console.log(typeof errors)

        if(!errors.isEmpty() || (bookinstance.due_back === null && bookinstance.status != 'Available')) {
            // Errors present
            Book.find({}, 'title')
                .exec(function(err, books) {
                    if(err) return next(err)

                    let errorsArray = errors.array()
                    if(bookinstance.due_back === null && bookinstance.status != 'Available')
                        errorsArray.push({ msg: 'Add a date.' })

                    res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id, errors: errorsArray, bookinstance: bookinstance })
                })
            return
        }
        else {
            // Data from form is valid
            bookinstance.save(function(err) {
                if(err) return next(err)

                res.redirect(bookinstance.url)
            })
        }
    }
]

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    BookInstance.findById(req.params.id, function(err, bookinstance) {
        if(err) return next(err)

        res.render('bookinstance_delete', { title: 'Delete Book Instance', bookinstance: bookinstance })
    })
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res, next) {
    BookInstance.findByIdAndRemove(req.body.bookinstanceid, function deleteBookInstance(err) {
        if(err) return next(err)

        res.redirect('/catalog/bookinstances')
    })
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
    // Get books and bookinstance for form
    async.parallel({
        bookinstance: function(callback) {
            BookInstance.findById(req.params.id).populate('book').exec(callback)
        },
        book_list: function(callback) {
            Book.find(callback)
        },
    }, function(err, results) {
        if(err) return next(err)

        if(results.bookinstance == null) {
            var err = new Error('Book instance not found.')
            err.status = 404
            return next(err)
        }

        // Success

        res.render('bookinstance_form', { title: 'Update Book Instance', book_list: results.book_list, bookinstance: results.bookinstance, selected_book: results.bookinstance.book._id })
    })
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
    // Validate fields.
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    // Sanitize fields.
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),

    // Process request after validation and sanitization
    (req, res, next) => {

        const errors = validationResult(req)

        // Create a BookInstance object with escaped and trimmed data.
        var bookinstance = new BookInstance(
            { book: req.body.book,
              imprint: req.body.imprint,
              status: req.body.status,
              due_back: req.body.due_back,
              _id: req.params.id
             })

        if(!errors.isEmpty()) {
            // There are errors. Render form again with sanitized values/error messages.

            // Get books and bookinstance for form
            async.parallel({
                bookinstance: function(callback) {
                    BookInstance.findById(req.params.id).populate('book').exec(callback)
                },
                book_list: function(callback) {
                    Book.find(callback)
                },
            }, function(err, results) {
                if(err) return next(err)

                if(results.bookinstance == null) {
                    var err = new Error('Book instance not found.')
                    err.status = 404
                    return next(err)
                }

                // Success

                res.render('bookinstance_form', { title: 'Update Book Instance', book_list: results.book_list, bookinstance: results.bookinstance, selected_book: results.bookinstance.book._id, errors: errors.array() })
            })
        }
        else {
             // Data from form is valid. Update the record.
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function(err, thebookinstance) {
                if(err) return next(err)

                res.redirect(thebookinstance.url)
            })
        }
    }
]