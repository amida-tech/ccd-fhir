/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
"use strict";

var expect = require('chai').expect;
var fs = require('fs');

var bbcms = require("../index");

describe('CCD parser test', function () {

    it('"CCD_20131121_ACMA10102495SLTXMWPGMandGoals" as input', function (done) {

        var istream = fs.createReadStream(__dirname + '/../../private-records/HCSC/CCD_20131121_ACMA10102495SLTXMWPGMandGoals.xml', 'utf-8');
        expect(istream).to.exist;

        istream
            .pipe(new bbcms.CcdParserStream())
            .on('data', function (data) {
                expect(data).to.exist;
                fs.writeFile(__dirname + '/artifacts/CCD_20131121_ACMA10102495SLTXMWPGMandGoals.json', JSON.stringify(data, null, '  '));

                var gold = fs.readFileSync(__dirname + '/artifacts/CCD_20131121_ACMA10102495SLTXMWPGMandGoals-gold.json', 'utf-8');
                expect(JSON.parse(gold)).to.eql(data);

            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                done(error);
            });

    });

    it('"CCD_20131216_ACMA99457456BCFDIG.xml" as input', function (done) {

        var istream = fs.createReadStream(__dirname + '/../../private-records/HCSC/CCD_20131216_ACMA99457456BCFDIG.xml', 'utf-8');
        expect(istream).to.exist;

        istream
            .pipe(new bbcms.CcdParserStream())
            .on('data', function (data) {
                expect(data).to.exist;
                fs.writeFile(__dirname + '/artifacts/CCD_20131216_ACMA99457456BCFDIG.json', JSON.stringify(data, null, '  '));

                var gold = fs.readFileSync(__dirname + '/artifacts/CCD_20131216_ACMA99457456BCFDIG-gold.json', 'utf-8');
                expect(JSON.parse(gold)).to.eql(data);

            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                done(error);
            });

    });

});
