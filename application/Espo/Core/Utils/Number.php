<?php
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

namespace Espo\Core\Utils;

class Number
{
    protected $decimalMark;

    protected $thousandSeparator;

    public function __construct($decimalMark = '.', $thousandSeparator = ',')
    {
        $this->decimalMark = $decimalMark;
        $this->thousandSeparator = $thousandSeparator;
    }

    public function format($value, $decimals = null)
    {
        if (!is_null($decimals)) {
             return number_format($value, $decimals, $this->decimalMark, $this->thousandSeparator);
        } else {
            $s = strval($value);
            $arr = explode('.', $value);

            $r = '0';
            if (!empty($arr[0])) {
                $r = number_format(intval($arr[0]), 0, '.', $this->thousandSeparator);
            }

            if (!empty($arr[1])) {
                $r = $r . $this->decimalMark . $arr[1];
            }

            return $r;
        }
    }

}


