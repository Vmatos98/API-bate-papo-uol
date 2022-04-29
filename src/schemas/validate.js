import Joi from 'joi';

const userSchema={
    name: Joi.string().required(),
};
module.exports = {
    userSchema
}