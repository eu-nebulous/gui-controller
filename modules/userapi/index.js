const { v4: uuidv4 } = require('uuid');

module.exports = {
    handlers(self) {
        return {
            beforeInsert: {
                async generateUuid(req, doc, options) {
                    if (!doc.uuid) {
                        doc.uuid = uuidv4();
                    }
                }
            },
        }
    },
    apiRoutes(self) {
        return {
            get: {
                async all(req) {
                    if (!self.apos.permission.can(req, 'admin')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }
                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;
                    const filters = {};

                    filters.createdBy = currentUser._id;
                    if (adminOrganization) {
                        filters.organization = adminOrganization;
                    }

                    try {
                        const users = await self.apos.user.find(req, filters).toArray();
                        return users;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async 'me'(req) {
                    const currentUser = req.user;
                    if (!currentUser) {
                        throw self.apos.error('forbidden', 'You must be logged in to access this information');
                    }

                    try {
                        const user = await self.apos.user.find(req, { uuid: currentUser.uuid }).toObject();

                        if (!user) {
                            throw self.apos.error('notfound', 'User not found');
                        }

                        return user;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/uuid'(req) {
                    if (!self.apos.permission.can(req, 'admin')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const userId = req.params.uuid;
                    if (!userId) {
                        throw self.apos.error('invalid', 'User UUID is required');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {
                        const user = await self.apos.user.find(req, { uuid: userId, organization:adminOrganization }).toObject();

                        if (!user) {
                            throw self.apos.error('notfound', 'User not found');
                        }

                        if (user.organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'Access denied');
                        }

                        return user;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
            },
            post: {
                async 'create-user'(req) {

                    if (!self.apos.permission.can(req, 'admin')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    const {username, password, email, firstname, lastname} = req.body;
                    if (!username || !password || !email) {
                        throw self.apos.error('invalid', 'Missing required fields');
                    }

                    try {
                        const username = req.body.username;
                        const userData = {
                            username: username,
                            title: username,
                            password: password,
                            email: email,
                            firstname: firstname,
                            lastname: lastname,
                            uuid: uuidv4(),
                            role: 'editor',
                            slug: `user-${username}`,
                            createdBy: currentUser._id,
                            organization: adminOrganization,
                        };

                        const user = await self.apos.user.insert(req, userData);

                        return user;
                    } catch (error) {
                        throw self.apos.error('invalid', error.message);
                    }
                }
            },
            delete: {
                async ':uuid/uuid'(req) {
                    const userId = req.params.uuid;

                    if (!userId) {
                        throw self.apos.error('invalid', 'User UUID is required');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;
                    const userToDelete = await self.apos.user.find(req, {uuid: userId, organization:adminOrganization}).toObject();

                    if (!userToDelete) {
                        throw self.apos.error('notfound', 'User not found');
                    }

                    if (userToDelete.organization !== adminOrganization) {
                        throw self.apos.error('forbidden', 'Access denied');
                    }

                    if (!self.apos.permission.can(req, 'admin') && userToDelete.createdBy !== currentUser.uuid) {
                        throw self.apos.error('forbidden', 'You do not have permission to perform this action.');
                    }

                    try {
                        await self.apos.doc.db.deleteOne({uuid: userId});

                        if (self.apos.db.collection('aposUsersSafe')) {
                            await self.apos.db.collection('aposUsersSafe').deleteOne({uuid: userId});
                        }

                        return {message: 'User deleted successfully'};
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            },
            patch: {
                async 'profile-update'(req) {
                    const currentUser = req.user;
                    const updateData = req.body;

                    try {
                        const updateFields = { ...updateData };
                        delete updateFields.password;

                        if (updateFields.username) {
                            updateFields.title = updateFields.username;
                            updateFields.slug = `user-${updateFields.username}`;

                            await self.apos.doc.db.updateOne(
                                {uuid: currentUser.uuid},
                                {
                                    $set: {
                                        username: updateFields.username,
                                        title: updateFields.username,
                                        slug: `user-${updateFields.username}`
                                    }
                                }
                            );
                        }
                        // Update other fields in aposDocs
                        if (Object.keys(updateFields).length > 0) {
                            await self.apos.doc.db.updateOne(
                                { uuid: currentUser.uuid },
                                { $set: updateFields }
                            );
                        }

                        await self.apos.db.collection('aposUserSafe').updateOne(
                            { _id: currentUser._id },
                            { $set: { username: updateData.username } }
                        );

                        if (updateData.password) {
                            const newPassword = updateData.password;

                            const hashedPassword = await self.apos.user.hashPassword(newPassword);

                            await self.apos.db.collection('aposUserSafe').updateOne(
                                { _id: currentUser._id },
                                { $set: { password: hashedPassword } }
                            );
                        }

                        const updatedUser = await self.apos.user.find(req, { uuid: currentUser.uuid }).toObject();

                        return updatedUser;
                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                },
                async ':uuid/uuid'(req) {
                    const userId = req.params.uuid;
                    const updateData = req.body;

                    if (!self.apos.permission.can(req, 'admin')) {
                        throw self.apos.error('forbidden', 'Insufficient permissions');
                    }

                    const currentUser = req.user;
                    const adminOrganization = currentUser.organization;

                    try {

                        const updateFields = { ...updateData };
                        delete updateFields.password;

                        const userToUpdate = await self.apos.user.find(req, { uuid: userId, organization:adminOrganization}).toObject();
                        if (!userToUpdate) {
                            throw self.apos.error('notfound', 'User not found');
                        }
                        if (userToUpdate.organization !== adminOrganization) {
                            throw self.apos.error('forbidden', 'You can only update users within your organization');
                        }

                        if (updateFields.username) {
                            updateFields.title = updateFields.username;
                            updateFields.slug = `user-${updateFields.username}`;

                            await self.apos.doc.db.updateOne(
                                { uuid: userId },
                                { $set: { username: updateFields.username, title: updateFields.username, slug: `user-${updateFields.username}` } }
                            );

                            await self.apos.db.collection('aposUserSafe').updateOne(
                                { _id: userToUpdate._id },
                                { $set: { username: updateFields.username } }
                            );
                        }

                        if (Object.keys(updateFields).length > 0) {
                            await self.apos.doc.db.updateOne(
                                { uuid: userId },
                                { $set: updateFields }
                            );
                        }
                        if (updateData.password) {
                            const newPassword = updateData.password;

                            const hashedPassword = await self.apos.user.hashPassword(newPassword);

                            await self.apos.db.collection('aposUserSafe').updateOne(
                                { _id: userToUpdate._id },
                                { $set: { password: hashedPassword } }
                            );
                        }

                        const updatedUser = await self.apos.user.find(req, { uuid: userId }).toObject();

                        return updatedUser;

                    } catch (error) {
                        throw self.apos.error(error.name, error.message);
                    }
                }
            }

        };
    }
};