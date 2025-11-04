'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // User - Migración generada automáticamente
        await queryInterface.bulkInsert('users', [
                {
                        "id": 1,
                        "name": "John Doe",
                        "email": "john@example.com",
                        "roleId": 1,
                        "createdAt": "2025-01-28T14:30:22.000Z",
                        "updatedAt": "2025-01-28T14:30:22.000Z"
                },
                {
                        "id": 2,
                        "name": "Jane Smith",
                        "email": "jane@example.com",
                        "roleId": 2,
                        "createdAt": "2025-01-28T14:30:22.000Z",
                        "updatedAt": "2025-01-28T14:30:22.000Z"
                }
        ]);
    },

    async down(queryInterface, Sequelize) {
        // Eliminar todos los registros insertados
        await queryInterface.bulkDelete('users', null, {});
    }
};