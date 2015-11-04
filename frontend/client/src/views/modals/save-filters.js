/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM - Open Source CRM application.
 * Copyright (C) 2014-2015 Yuri Kuznetsov, Taras Machyshyn, Oleksiy Avramenko
 * Website: http://www.espocrm.com
 *
 * EspoCRM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * EspoCRM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with EspoCRM. If not, see http://www.gnu.org/licenses/.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/


Espo.define('Views.Modals.SaveFilters', ['Views.Modal', 'Model'], function (Dep, Model) {

    return Dep.extend({

        cssName: 'save-filters',

        template: 'modals.save-filters',

        data: function () {
            return {
                dashletList: this.dashletList,
            };
        },

        setup: function () {
            this.buttons = [
                {
                    name: 'save',
                    label: 'Save',
                    style: 'primary',
                    onClick: function (dialog) {
                        this.save();
                    }.bind(this)
                },
                {
                    name: 'cancel',
                    label: 'Cancel',
                    onClick: function (dialog) {
                        dialog.close();
                    }
                }
            ];

            this.header = this.translate('Save Filters');

            var model = new Model();
            this.createView('name', 'Fields.Varchar', {
                el: this.options.el + ' .field-name',
                defs: {
                    name: 'name',
                    params: {
                        required: true
                    }
                },
                mode: 'edit',
                model: model
            });
        },

        save: function () {
            var nameView = this.getView('name');
            nameView.fetchToModel();
            if (nameView.validate()) {
                return;
            }
            this.trigger('save', nameView.model.get('name'));
            return true;
        },
    });
});


