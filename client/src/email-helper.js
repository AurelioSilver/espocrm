/************************************************************************
 * This file is part of EspoCRM.
 *
 * EspoCRM – Open Source CRM application.
 * Copyright (C) 2014-2025 Yurii Kuznietsov, Taras Machyshyn, Oleksii Avramenko
 * Website: https://www.espocrm.com
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * The interactive user interfaces in modified source and object code versions
 * of this program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU Affero General Public License version 3.
 *
 * In accordance with Section 7(b) of the GNU Affero General Public License version 3,
 * these Appropriate Legal Notices must retain the display of the "EspoCRM" word.
 ************************************************************************/

/** @module email-helper */

/**
 * An email helper.
 */
class EmailHelper {

    /**
     * @param {module:language} language A language.
     * @param {module:models/user} user A user.
     * @param {module:date-time} dateTime A date-time util.
     * @param {module:acl-manager} acl An ACL manager.
     */
    constructor(language, user, dateTime, acl) {
        /** @private */
        this.language = language;
        /** @private */
        this.user = user;
        /** @private */
        this.dateTime = dateTime;
        /** @private */
        this.acl = acl;

        /** @private */
        this.erasedPlaceholder = 'ERASED:';
    }

    /**
     * @returns {module:language}
     */
    getLanguage() {
        return this.language;
    }

    /**
     * @returns {module:models/user}
     */
    getUser() {
        return this.user;
    }

    /**
     * @returns {module:date-time}
     */
    getDateTime() {
        return this.dateTime;
    }

    /**
     * Get reply email attributes.
     *
     * @param {module:model} model An email model.
     * @param {Object|null} [data=null] Action data. Unused.
     * @param {boolean} [cc=false] To include CC (reply-all).
     * @returns {Object.<string, *>}
     */
    getReplyAttributes(model, data, cc) {
        const attributes = {
            status: 'Draft',
            isHtml: model.get('isHtml'),
        };

        const subject = model.get('name') || '';

        attributes['name'] = subject.toUpperCase().indexOf('RE:') !== 0 ?
            'Re: ' + subject :
            subject;

        let to = '';
        let isReplyOnSent = false;
        const nameHash = model.get('nameHash') || {};
        const replyToAddressString = model.get('replyTo') || null;
        const replyToString = model.get('replyToString') || null;
        const userEmailAddressList = this.getUser().get('emailAddressList') || [];
        const idHash = model.attributes.idHash || {};
        const typeHash = model.attributes.typeHash || {};

        if (replyToAddressString) {
            const replyToAddressList = replyToAddressString.split(';');

            to = replyToAddressList.join(';');
        }
        else if (replyToString) {
            const a = [];

            replyToString.split(';').forEach(item => {
                const part = item.trim();
                const address = this.parseAddressFromStringAddress(item);

                if (address) {
                    a.push(address);

                    const name = this.parseNameFromStringAddress(part);

                    if (name && name !== address) {
                        nameHash[address] = name;
                    }
                }
            });

            to = a.join(';');
        }

        if (
            (!to || !to.includes('@')) &&
            model.get('from')
        ) {
            if (!userEmailAddressList.includes(model.get('from'))) {
                to = model.get('from');

                if (!nameHash[to]) {
                    const fromString = model.get('fromString') || model.get('fromName');

                    if (fromString) {
                        const name = this.parseNameFromStringAddress(fromString);

                        if (name !== to) {
                            nameHash[to] = name;
                        }
                    }
                }
            }
            else {
                isReplyOnSent = true;
            }
        }

        attributes.to = to;

        if (cc) {
            attributes.cc = model.get('cc') || '';

            /** @type {string[]} */
            const excludeFromReplyEmailAddressList = this.getUser().get('excludeFromReplyEmailAddressList') || [];

            (model.get('to') || '').split(';').forEach(item => {
                item = item.trim();

                if (item === this.getUser().get('emailAddress')) {
                    return;
                }

                if (excludeFromReplyEmailAddressList.includes(item)) {
                    return;
                }

                if (isReplyOnSent) {
                    if (attributes.to) {
                        attributes.to += ';';
                    }

                    attributes.to += item;

                    return;
                }

                if (attributes.cc) {
                    attributes.cc += ';';
                }

                attributes.cc += item;
            });

            attributes.cc = attributes.cc.replace(/^(; )/,"");
        }

        if (attributes.to) {
            let toList = attributes.to.split(';');

            toList = toList.filter(item => {
                if (item.indexOf(this.erasedPlaceholder) === 0) {
                    return false;
                }

                return true;
            });

            attributes.to = toList.join(';');
        }

        /** @type {string[]} */
        const personalAddresses = this.getUser().get('userEmailAddressList') || [];
        const lcPersonalAddresses = personalAddresses.map(it => it.toLowerCase());

        if (attributes.cc) {
            const ccList = attributes.cc.split(';')
                .filter(item => {
                    if (lcPersonalAddresses.includes(item.toLowerCase())) {
                        return false;
                    }

                    if (item.indexOf(this.erasedPlaceholder) === 0) {
                        return false;
                    }

                    return true;
                });

            attributes.cc = ccList.join(';');
        }

        if (model.get('parentId')) {
            attributes['parentId'] = model.get('parentId');
            attributes['parentName'] = model.get('parentName');
            attributes['parentType'] = model.get('parentType');
        }

        if (model.get('teamsIds') && model.get('teamsIds').length) {
            attributes.teamsIds = Espo.Utils.clone(model.get('teamsIds'));
            attributes.teamsNames = Espo.Utils.clone(model.get('teamsNames') || {});

            const defaultTeamId = this.user.get('defaultTeamId');

            if (defaultTeamId && !~attributes.teamsIds.indexOf(defaultTeamId)) {
                attributes.teamsIds.push(this.user.get('defaultTeamId'));
                attributes.teamsNames[this.user.get('defaultTeamId')] = this.user.get('defaultTeamName');
            }

            attributes.teamsIds = attributes.teamsIds
                .filter(teamId => this.acl.checkTeamAssignmentPermission(teamId));
        }

        attributes.nameHash = nameHash;
        attributes.typeHash = typeHash;
        attributes.idHash = idHash;
        attributes.repliedId = model.id;
        attributes.inReplyTo = model.get('messageId');

        /** @type {string[]} */
        const lcToAddresses = (model.attributes.to || '').split(';').map(it => it.toLowerCase());

        for (const address of personalAddresses) {
            if (lcToAddresses.includes(address.toLowerCase())) {
                attributes.from = address;

                break;
            }
        }

        this.addReplyBodyAttributes(model, attributes);

        return attributes;
    }

    /**
     * Get forward email attributes.
     *
     * @param {module:model} model An email model.
     * @returns {Object}
     */
    getForwardAttributes(model) {
        const attributes = {
            status: 'Draft',
            isHtml: model.get('isHtml'),
        };

        const subject = model.get('name');

        if (~!subject.toUpperCase().indexOf('FWD:') && ~!subject.toUpperCase().indexOf('FW:')) {
            attributes['name'] = 'Fwd: ' + subject;
        }
        else {
            attributes['name'] = subject;
        }

        if (model.get('parentId')) {
            attributes['parentId'] = model.get('parentId');
            attributes['parentName'] = model.get('parentName');
            attributes['parentType'] = model.get('parentType');
        }

        this.addForwardBodyAttributes(model, attributes);

        return attributes;
    }

    /**
     * Add body attributes for a forward email.
     *
     * @param {module:model} model An email model.
     * @param {Object} attributes
     */
    addForwardBodyAttributes(model, attributes) {
        let prepending = '';

        if (model.get('isHtml')) {
            prepending = '<br>' + '------' +
                this.getLanguage().translate('Forwarded message', 'labels', 'Email') + '------';
        }
        else {
            prepending = '\n\n' + '------' +
                this.getLanguage().translate('Forwarded message', 'labels', 'Email') + '------';
        }

        const list = [];

        if (model.get('from')) {
            const from = model.get('from');
            let line = this.getLanguage().translate('from', 'fields', 'Email') + ': ';

            const nameHash = model.get('nameHash') || {};

            if (from in nameHash) {
                line += nameHash[from] + ' ';
            }

            if (model.get('isHtml')) {
                line += '&lt;' + from + '&gt;';
            }
            else {
                line += '<' + from + '>';
            }

            list.push(line);
        }

        if (model.get('dateSent')) {
            let line = this.getLanguage().translate('dateSent', 'fields', 'Email') + ': ';
            line += this.getDateTime().toDisplay(model.get('dateSent'));

            list.push(line);
        }

        if (model.get('name')) {
            let line = this.getLanguage().translate('subject', 'fields', 'Email') + ': ';

            line += model.get('name');

            list.push(line);
        }

        if (model.get('to')) {
            let line = this.getLanguage().translate('to', 'fields', 'Email') + ': ';

            const partList = [];

            model.get('to').split(';').forEach(to => {
                const nameHash = model.get('nameHash') || {};
                let line = '';

                if (to in nameHash) {
                    line += nameHash[to] + ' ';
                }

                if (model.get('isHtml')) {
                    line += '&lt;' + to + '&gt;';
                }
                else {
                    line += '<' + to + '>';
                }

                partList.push(line);
            });

            line += partList.join(';');

            list.push(line);
        }

        list.forEach(line => {
            if (model.get('isHtml')) {
                prepending += '<br>' + line;
            }
            else {
                prepending += '\n' + line;
            }
        });

        if (model.get('isHtml')) {
            const body = model.get('body');

            attributes['body'] = prepending + '<br><br>' + body;
        }
        else {
            const bodyPlain = model.get('body') || model.get('bodyPlain') || '';

            attributes['bodyPlain'] = attributes['body'] = prepending + '\n\n' + bodyPlain;
        }
    }

    /**
     * Parse a name from a string address.
     *
     * @param {string} value A string address. E.g. `Test Name <address@domain>`.
     * @returns {string|null}
     */
    parseNameFromStringAddress(value) {
        if (!value.includes('<')) {
            return null;
        }

        let name = value.replace(/<(.*)>/, '').trim();

        if (name.charAt(0) === '"' && name.charAt(name.length - 1) === '"') {
            name = name.slice(1, name.length - 2);
        }

        return name;
    }

    /**
     * Parse an address from a string address.
     *
     * @param {string} value A string address. E.g. `Test Name <address@domain>`.
     * @returns {string|null}
     */
    parseAddressFromStringAddress(value) {
        const r = value.match(/<(.*)>/);
        let address;

        if (r && r.length > 1) {
            address = r[1];
        }
        else {
            address = value.trim();
        }

        return address;
    }

    /**
     * Add body attributes for a reply email.
     *
     * @param {module:model} model An email model.
     * @param {Object.<string, *>} attributes
     */
    addReplyBodyAttributes(model, attributes) {
        const format = this.getDateTime().getReadableShortDateTimeFormat();

        const dateSent = model.get('dateSent');

        let dateSentString = null;

        if (dateSent) {
            const dateSentMoment = this.getDateTime().toMoment(dateSent);

            dateSentString = dateSentMoment.format(format);

            if (dateSentMoment.year() !== this.getDateTime().getNowMoment().year()) {
                dateSentString += ', ' + dateSentMoment.year();
            }
        }

        let replyHeadString =
            (dateSentString || this.getLanguage().translate('Original message', 'labels', 'Email'));

        let fromName = model.get('fromName');

        if (!fromName && model.get('from')) {
            fromName = (model.get('nameHash') || {})[model.get('from')];

            if (fromName) {
                replyHeadString += ', ' + fromName;
            }
        }

        replyHeadString += ':';

        if (model.get('isHtml')) {
            const body = model.get('body');

            attributes['body'] = `<p data-quote-start="true"><br></p>` +
                `<p>${replyHeadString}</p><blockquote>${body}</blockquote>`;

            return;
        }

        let bodyPlain = model.get('body') || model.get('bodyPlain') || '';

        let b = '\n\n';

        b += replyHeadString + '\n';

        bodyPlain.split('\n').forEach(line => {
            b += '> ' + line + '\n';
        });

        bodyPlain = b;

        attributes['body'] = bodyPlain;
        attributes['bodyPlain'] = bodyPlain;
    }
}

export default EmailHelper;
