/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
"use strict";

var expect = require('chai').expect;
var fs = require('fs');

var bbcms = require("../index");

var testoOn = function (infile, outfile, goldfile, done) {
    var istream = fs.createReadStream(infile, 'utf-8');
    expect(istream).to.exist;

    istream
        .pipe(new bbcms.CcdParserStream())
        .on('data', function (data) {
            expect(data).to.exist;
            fs.writeFile(outfile, JSON.stringify(data, null, '  '));

            if (goldfile) {
                var gold = fs.readFileSync(goldfile, 'utf-8');
                expect(JSON.parse(gold)).to.eql(data);
            }

        })
        .on('finish', function () {
            done();
        })
        .on('error', function (error) {
            done(error);
        });
};

describe('CCD parser test', function () {

    it('"CCD_20131121_ACMA10102495SLTXMWPGMandGoals" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }

        testoOn(__dirname + '/../../private-records/HCSC/CCD_20131121_ACMA10102495SLTXMWPGMandGoals.xml',
            __dirname + '/artifacts/CCD_20131121_ACMA10102495SLTXMWPGMandGoals.json',
            __dirname + '/artifacts/CCD_20131121_ACMA10102495SLTXMWPGMandGoals-gold.json',
            done
        );

    });

    it('"CCD_20131216_ACMA99457456BCFDIG" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }
        testoOn(__dirname + '/../../private-records/HCSC/CCD_20131216_ACMA99457456BCFDIG.xml',
            __dirname + '/artifacts/CCD_20131216_ACMA99457456BCFDIG.json',
            __dirname + '/artifacts/CCD_20131216_ACMA99457456BCFDIG-gold.json',
            done
        );

    });
    it('"DEID02732967ZVZACA_CCD.xml" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }
        testoOn(__dirname + '/../../private-records/medicasoft/deidccd/DEID02732967ZVZACA_CCD.xml',
            __dirname + '/artifacts/DEID02732967ZVZACA_CCD.json',
            __dirname + '/artifacts/DEID02732967ZVZACA_CCD-gold.json',
            done
        );
    });

    it('"DEID06068444RGVUDR_CCD.xml" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }
        testoOn(__dirname + '/../../private-records/medicasoft/deidccd/DEID06068444RGVUDR_CCD.xml',
            __dirname + '/artifacts/DEID06068444RGVUDR_CCD.json',
            __dirname + '/artifacts/DEID06068444RGVUDR_CCD-gold.json',
            done
        );
    });

    it('"DEID10023094WRYZBV_CCD.xml" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }
        testoOn(__dirname + '/../../private-records/medicasoft/deidccd/DEID10023094WRYZBV_CCD.xml',
            __dirname + '/artifacts/DEID10023094WRYZBV_CCD.json',
            __dirname + '/artifacts/DEID10023094WRYZBV_CCD-gold.json',
            done
        );
    });

    it('"DEID10054139UQVPSZ_CCD.xml" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }
        testoOn(__dirname + '/../../private-records/medicasoft/deidccd/DEID10054139UQVPSZ_CCD.xml',
            __dirname + '/artifacts/DEID10054139UQVPSZ_CCD.json',
            __dirname + '/artifacts/DEID10054139UQVPSZ_CCD-gold.json',
            done
        );
    });

    it('"DEID10091332GJSVIQ_CCD.xml" as input', function (done) {

        if (process.env.TRAVIS === 'true') {
            return done();
        }
        testoOn(__dirname + '/../../private-records/medicasoft/deidccd/DEID10091332GJSVIQ_CCD.xml',
            __dirname + '/artifacts/DEID10091332GJSVIQ_CCD.json',
            __dirname + '/artifacts/DEID10091332GJSVIQ_CCD-gold.json',
            done
        );

    });

    it('"SampleCCDDocument.xml" as input', function (done) {

        var request = require('request');
        var data = request.get('https://raw.githubusercontent.com/amida-tech/blue-button/master/test/fixtures/parser-ccd/SampleCCDDocument.xml');

        data
            .pipe(new bbcms.CcdParserStream('test'))
            .on('data', function (data) {
                expect(data).to.exist;
                //fs.writeFile(__dirname + '/artifacts/SampleCCDDocument.xml.json', JSON.stringify(data, null, '  '));
            })
            .on('finish', function () {
                done();
            })
            .on('error', function (error) {
                done(error);
            });

    });

});
