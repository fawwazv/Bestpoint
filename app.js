const express = require('express');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const Joi = require('joi');
const wrapAsync = require('./utils/wrapAsync');
const ErrorHandler = require('./utils/ErrorHandler');
const app = express();
const path = require('path');

//models
const Place = require('./models/place');
const Review = require('./models/review');

//schemas
const { placeSchema } = require('./schemas/place');     
const { reviewSchema } = require('./schemas/review');                                    

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/bestpoints')
.then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Error connecting to MongoDB:', err);
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

const validatePlace = (req, res, next) => {
    const { error } = placeSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(', ');
        return next(new ErrorHandler(msg, 400));
    }
    next();
};

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(', ');
        return next(new ErrorHandler(msg, 400));
    }
    next();
};

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/places', wrapAsync(async (req, res) => {
    const places = await Place.find({});
    res.render('places/index', { places });
}));

app.get('/places/create', (req, res) => {
    res.render('places/create');
});

app.post('/places', validatePlace, wrapAsync(async (req, res, next) => {
    const place = new Place(req.body.place);
    await place.save();
    res.redirect(`/places`);
}));

app.get('/places/:id', wrapAsync(async (req, res) => {
    const place = await Place.findById(req.params.id).populate('reviews');
    res.render('places/show', { place });
}));

app.get('/places/:id/edit', wrapAsync(async (req, res) => {
    const place = await Place.findById(req.params.id);
    res.render('places/edit', { place });
}));

app.put('/places/:id', validatePlace, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const place = await Place.findByIdAndUpdate(req.params.id, {...req.body.place});
    res.redirect('/places');
}));

app.delete('/places/:id', wrapAsync(async (req, res) => {
    await Place.findByIdAndDelete(req.params.id);
    res.redirect('/places');
}));

app.post('/places/:id/reviews',validateReview, wrapAsync(async (req, res) => {
    const review = new Review(req.body.review);
    const place = await Place.findById(req.params.id);
    place.reviews.push(review);
    await review.save();
    await place.save();
    res.redirect(`/places/${req.params.id}`);
}));

app.delete('/places/:place_id/reviews/:review_id', wrapAsync(async (req, res) => {
    const { place_id, review_id } = req.params;
    await Place.findByIdAndUpdate(place_id, { $pull: { reviews: review_id } });
    await Review.findByIdAndDelete(review_id);
    res.redirect(`/places/${place_id}`);
}));

app.all('/{*splat}', (req, res, next) => {
    next(new ErrorHandler('Page Not Found', 404));
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if(!err.message) err.message = 'Oh No, Something went wrong!';
    res.status(statusCode).render('error', { err });
});

app.listen(3000, () => {
    console.log('Server is running on http://127.0.0.1:3000');
});