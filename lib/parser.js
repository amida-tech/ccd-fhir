/* jshint -W003 */
/* jshint -W040 */
/// <reference path="../typings/node/node.d.ts"/>
/// <reference path="../typings/mocha/mocha.d.ts"/>
/// <reference path="../typings/lodash/lodash.d.ts" />

"use strict";

//TODO process substanceAdministration/performer
// Startup file for debugging
//var fs = require('fs');
var _ = require("lodash");

var getResource = function (resType, init) {
    var res = {
        'resourceType': resType
    };
    if (init) {
        _.merge(res, init);
    }
    return res;
};

var serial = 0;

var attachTemplate = function (node, templateId) {
    node.templateId = templateId;
    return node;
};

/**
 * Construct triplet used as reference to a node and associated data.
 * @param {Object} node
 * @param {Object} entity
 * @param {Array} [templateId]
 */
var Triplet = function (node, entity, templateId) {
    this.node = node;
    this.entity = entity;
    if (templateId) {
        this.templateId = templateId;
    }
};

var findPatient = function (bundle) {
    var patient;
    _.each(bundle.entry, function (value) {
        if (value.resource.resourceType === 'Patient') {
            patient = value.resource;
            return false;
        }
        return true;
    });
    return patient;
};

var dateFix = function (date) {
    if (date) {
        switch (date.length) {
        case 6:
            return date.substr(0, 4) + '-' + date.substr(4, 2);
        case 8:
            return date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2);
        case 12: //200003231430
            return date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2) + 'T' + date.substr(8, 2) + ':' + date.substr(10, 2) + ':00';
        case 19: //20090227130000+0500
            return date.substr(0, 4) + '-' + date.substr(4, 2) + '-' + date.substr(6, 2) + 'T' + date.substr(8, 2) + ':' + date.substr(10, 2) + ':' + date.substr(12, 2); // + 'GMT' + date.substr(14, 3);
        }
    }
    return date;
};

var valueFix = function (node) {
    var value = {};
    if (node.attributes['xsi:type'] === 'PQ') {
        var tmp = Number(node.attributes.value);
        if (tmp === Number.NaN) {
            tmp = node.attributes.value;
        }
        value = {
            'value': tmp,
            'unit': node.attributes.unit
        };
    }
    return value;
};

var isInContextOf = function (oids) {
    var inContext;
    if (_.isArray(oids)) {
        inContext = _.findLast(proto.control, function (triplet) {
            return _.any(triplet.templateId, function (value) {
                return _.contains(oids, value);
            });
        });
    } else {
        inContext = _.findLast(proto.control, function (triplet) {
            return _.contains(triplet.templateId, oids);
        });
    }
    return inContext || false;
};

var store2bundle = function (resource, patientId) {
    proto.bundle.entry.push({
        'resource': resource
    });
    if (proto.composition) {
        proto.composition.section.push({
            'entry': [{
                'reference': resource.id
            }]
        });
    }
};

var makeCode = function (node, dropDisplayeElement) {
    if (node.attributes.nullFlavor) {
        return {};
    }

    var retval;
    if (node.attributes.codeSystem) {
        var isOidBased = node.attributes.codeSystem.match(/(?:urn\:oid\:){0,1}([\d\.]+)/);
        var system;
        if (isOidBased.length > 1) {
            //Reference - http://www.hl7.org/FHIR/2015May/terminologies-systems.html
            //and https://hl7-fhir.github.io/namingsystem-terminologies.html
            //TODO - complete recoding
            switch (isOidBased[1]) {
            case '2.16.840.1.113883.6.96':
                system = 'http://snomed.info/sct';
                break;
            case '2.16.840.1.113883.6.88':
                system = 'http://www.nlm.nih.gov/research/umls/rxnorm';
                break;
            case '2.16.840.1.113883.6.1':
                system = 'http://loinc.org';
                break;
            case '2.16.840.1.113883.6.8':
                system = 'http://unitsofmeasure.org';
                break;
            case '2.16.840.1.113883.3.26.1.2':
                system = 'http://ncimeta.nci.nih.gov';
                break;
            case '2.16.840.1.113883.6.12':
                system = 'http://www.ama-assn.org/go/cpt';
                break;
            case '2.16.840.1.113883.6.209':
                system = 'http://hl7.org/fhir/ndfrt';
                break;
            case '2.16.840.1.113883.4.9':
                system = 'http://hl7.org/fhir/ndfrt';
                break;
            case '2.16.840.1.113883.4.9':
                system = 'http://fdasis.nlm.nih.gov';
                break;
            case '2.16.840.1.113883.12.292':
                system = 'http://www2a.cdc.gov/vaccines/iis/iisstandards/vaccines.asp?rpt=cvx';
                break;
            case '1.0.3166.1.2.2':
                system = 'urn:iso:std:iso:3166';
                break;
            case '2.16.840.1.113883.6.301.5':
                system = 'http://www.nubc.org/patient-discharge';
                break;
            case '2.16.840.1.113883.6.256':
                system = 'http://www.radlex.org';
                break;
            case '2.16.840.1.113883.6.3':
                system = 'http://hl7.org/fhir/sid/icd-10';
                break;
            case '2.16.840.1.113883.6.4':
                system = 'http://www.icd10data.com/icd10pcs';
                break;
            case '2.16.840.1.113883.6.42':
                system = 'http://hl7.org/fhir/sid/icd-9';
                break;
            case '2.16.840.1.113883.6.73':
                system = 'http://www.whocc.no/atc';
                break;
            case '2.16.840.1.113883.6.24':
                system = 'urn:std:iso:11073:10101';
                break;
            case '1.2.840.10008.2.16.4':
                system = 'http://nema.org/dicom/dicm';
                break;
            case '2.16.840.1.113883.6.281':
                system = 'http://www.genenames.org';
                break;
            case '2.16.840.1.113883.6.280':
                system = 'http://www.ncbi.nlm.nih.gov/nuccore';
                break;
            case '2.16.840.1.113883.6.282':
                system = 'http://www.hgvs.org/mutnomen';
                break;
            case '2.16.840.1.113883.6.284':
                system = 'http://www.ncbi.nlm.nih.gov/projects/SNP';
                break;
            case '2.16.840.1.113883.3.912':
                system = 'http://cancer.sanger.ac.uk/cancergenome/projects/cosmic';
                break;
            case '2.16.840.1.113883.6.283':
                system = 'http://www.hgvs.org/mutnomen';
                break;
            case '2.16.840.1.113883.6.174':
                system = 'http://www.omim.org';
                break;
            case '2.16.840.1.113883.13.191':
                system = 'http://www.ncbi.nlm.nih.gov/pubmed';
                break;
            case '2.16.840.1.113883.3.913':
                system = 'http://www.pharmgkb.org';
                break;
            case '2.16.840.1.113883.3.1077':
                system = 'http://clinicaltrials.gov';
                break;
            case '2.16.840.1.113883.6.69':
                system = 'http://hl7.org/fhir/sid/ndc';
                break;
            case '2.16.840.1.113883.5.4':
                system = 'http://hl7.org/fhir/v3/ActCode';
                break;
            case '2.16.840.1.113883.5.1063':
                system = 'http://hl7.org/fhir/v3/ObservationValue';
                break;
            case '2.16.840.1.113883.5.83':
                system = 'http://hl7.org/fhir/v3/ObservationInterpretation';
                break;
            default:
                var v2 = '2.16.840.1.113883.12.';
                if (_.startsWith(v2, node.attributes.codeSystem)) {
                    var tail = node.attributes.codeSystem.substring(v2.length);
                    system = 'http://hl7.org/fhir/v2/' + tail;
                    break;
                }
                system = 'urn:oid:' + node.attributes.codeSystem;
                break;
            }
        }
        retval = {
            'system': system,
            'code': node.attributes.code
        };
    } else {
        if (node.attributes.code) {
            retval = {
                'code': node.attributes.code
            };
        } else {
            retval = {};
        }
    }
    if (node.attributes.displayName && !dropDisplayeElement) {
        retval.display = node.attributes.displayName;
    }
    return retval;
};

var makeQuantity = function (node) {
    return makeCode(node, true);
};

var recodeAddrUse = function (use) {
    switch (use) {
    case 'H':
    case 'HP':
        return 'home';
    case 'WP':
        return 'work';
    case 'TMP':
        return 'temp';
    case 'OLD':
        return 'old';
    default:
        return use;
    }
};

var recodeTelecomUse = function (use) {
    switch (use) {
    case 'H':
    case 'HP':
        return 'home';
    case 'WP':
        return 'work';
    case 'TMP':
        return 'temp';
    case 'OLD':
        return 'old';
    case 'MC':
        return 'mobile';
    default:
        return use;
    }
};

var recodeGender = function (gender) {
    switch (gender) {
    case 'F': // Female
    case 'f':
        return 'female';
    case 'M': // Male
    case 'm':
        return 'male';
    case 'U': // Undifferentiated
    case 'u':
        return 'unknown';
    default:
        return 'unknown';
    }
};

var recodeNameUse = function (use) {
    // usual | official | temp | nickname | anonymous | old | maiden
    // see http://www.cdapro.com/know/25041
    switch (use) {
    case 'C':
        return 'official';
    case 'L':
        return 'usual';
    case 'A':
    case 'I':
    case 'P':
    case 'R':
        return 'nickname';
    default:
        return use;
    }
};

var recodeTelecom = function (node) {
    if (node.attributes.nullFlavor) {
        return null;
    }
    var telecom = {};

    if (node.attributes.use) {
        telecom.use = recodeTelecomUse(node.attributes.use);
    }

    var attr = node.attributes.value.split(':');
    if (attr.length === 2) {
        switch (attr[0]) {
        case 'tel':
            telecom.system = 'phone';
            telecom.value = attr[1];
            break;
        case 'mailto':
            telecom.system = 'email';
            telecom.value = attr[1];
            break;
        case 'fax':
            telecom.system = 'fax';
            telecom.value = attr[1];
            break;
        case 'http':
        case 'https':
            telecom.system = 'url';
            telecom.value = node.attributes.value;
            break;
        }
    } else {
        telecom.value = node.attributes.value;

    }
    return telecom;
};

/** Check/create property of an object */
var ensureProperty = function (prop, isArray) {
    if (!this[prop]) {
        this[prop] = (isArray) ? [] : {};
    }
    return this[prop];
};

var findResource = function (id) {
    var resource;

    _.each(this, function (value) {
        if (value.resource.id === id) {
            resource = value.resource;
            return false;
        }
        return true;
    });
    return resource;
};

var findLastResourceOfType = function (resourceType) {
    return _.findLast(this, function (value) {
        return value.resource.resourceType === resourceType;
    });
};

var makeTransactionalBundle = function (bundle, base) {
    _.each(bundle.entry, function (value) {
        value.request = {
            'method': 'POST',
            'url': value.resource.resourceType
        };
        value.base = base;
    });
    return bundle;
};

var makeAndStoreObservation = function (patient) {

    var observation = getResource('Observation', {
        'id': 'Observation/' + (serial++).toString(),
        'subject': {
            'reference': patient.id
        }
    });
    store2bundle(observation, patient.id);

    return observation;
};

//Make it common root
var proto = {
    tags: [], // Stack of XML tags processed
    bundle: {},
    composition: {},

    obj: function () {
        return this;
    },

    id: function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        ensureProperty.call(this, 'identifier', true).push({
            'system': 'urn:oid:' + node.attributes.root,
            'value': node.attributes.extension
        });
    }
};

//last.prototype = proto;

//CatchAll element
var Dummy = function () {

};

Dummy.prototype = proto;

var dummy = new Dummy();

var Organization = function (organization) {

    this.name$ = function (text) {
        organization.name = text;
    };

    this.telecom = function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        ensureProperty.call(organization, 'telecom', true).push(recodeTelecom(node));
    };

    this.addr = function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        var address = {};
        if (node.attributes.use) {
            address.use = recodeAddrUse(node.attributes.use);
        }
        ensureProperty.call(organization, 'address', true).push(address);

        proto.control.push(new Triplet(node, new Addr(address)));
    };

};
Organization.prototype = proto;

var makeAndStore = function (resource, patient, subject) {
    var tmp = getResource(resource, {
        'id': resource + '/' + (serial++).toString()
    });
    var id;
    if (patient) {
        tmp.patient = {
            'reference': patient.id
        };
        id = patient.id;
    } else if (subject) {
        tmp.subject = {
            'reference': subject.id
        };
        id = subject.id;
    }
    store2bundle(tmp, id);

    return tmp;
};

/**
 * AKA assignedAuthor
 */
var AssignedEntity = function (resource, templateId) {

    var patient = findPatient(proto.bundle);

    if (resource.resourceType === 'Observation') {
        var observation = resource;

        var checkPractitioner = function () {
            var practitioner = _.first(ensureProperty.call(observation, 'performer', true), function (value) {
                return value.resourceType === 'Practitioner';
            });
            if (!practitioner) {
                practitioner = makeAndStore('Practitioner', patient, null);
                observation.performer.push({
                    'reference': patient.id
                });
            }
            return practitioner;
        };

        this._self = {
            id: function (node) {
                if (node.attributes.extension && node.attributes.root && !node.attributes.nullFlavor) {
                    var practitioner = checkPractitioner();
                    ensureProperty.call(practitioner, 'identifier', true).push({
                        'system': node.attributes.root,
                        'value': node.attributes.extension
                    });
                }
            },
            code: function (node) {
                var practitioner = checkPractitioner();
                ensureProperty.call(practitioner, 'practitionerRole', true).push({
                    'specialty': {
                        'coding': [makeCode(node)]
                    }
                });
            },
            addr: function (node) {
                if (node.attributes.nullFlavor === 'UNK') {
                    return;
                }
                var practitioner = checkPractitioner();
                var address = {};
                if (node.attributes.use) {
                    address.use = recodeAddrUse(node.attributes.use);
                }
                ensureProperty.call(practitioner, 'address', true).push(address);

                proto.control.push(new Triplet(node, new Addr(address)));
            },

            telecom: function (node) {
                if (node.attributes.nullFlavor) {
                    return;
                }
                var practitioner = checkPractitioner();

                ensureProperty.call(practitioner, 'telecom', true).push(recodeTelecom(node));
            },

            representedOrganization: function (node) {

                var organization = makeAndStore('Organization', null, null);

                ensureProperty.call(observation, 'performer', true).push({
                    'reference': organization.id
                });
                proto.control.push(new Triplet(node, new Organization(organization)));
            },

            assignedPerson: function (node) {
                if (node.attributes.nullFlavor === 'UNK') {
                    return;
                }
                var practitioner = checkPractitioner();

                proto.control.push(new Triplet(node, new AssignedPerson(practitioner)));
            }
        };
    }

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
AssignedEntity.prototype = proto;

var Performer = function (resource) {
    var templateId = [];
    var patient = findPatient(proto.bundle);

    switch (resource.resourceType) {
    case 'Practitioner':
        var practitioner = resource;
        this._self = {
            assignedEntity: function (node) {
                proto.control.push(new Triplet(node, new AssignedEntity(practitioner), templateId));
            }
        };
        this._self.prototype = proto;
        break;
    case 'MedicationAdministration':
        var medicationAdministration = resource;
        this._self = {
            templateId: function (node) {
                templateId.push(node.attributes.root);
            },
            assignedEntity: function (node) {
                var practitioner = {
                    'resourceType': 'Practitioner',
                    'id': 'Practitioner/' + (serial++).toString()
                };

                proto.bundle.entry.push({
                    'resource': practitioner
                });
                proto.composition.section.push({
                    'subject': {
                        'reference': patient.id
                    },
                    'content': {
                        'reference': practitioner.id
                    }
                });
                medicationAdministration.practitioner = {
                    'reference': practitioner.id
                };
                proto.control.push(new Triplet(node, new AssignedEntity(practitioner), templateId));
            }
        };
        this._self.prototype = proto;
        break;
    case 'Immunization':
        var immunization = resource;
        this._self = {
            templateId: function (node) {
                templateId.push(node.attributes.root);
            },
            assignedEntity: function (node) {
                var practitioner = getResource('Practitioner', {
                    'id': 'Practitioner/' + (serial++).toString()
                });
                store2bundle(practitioner, patient.id);

                immunization.performer = {
                    'reference': practitioner.id
                };
                proto.control.push(new Triplet(node, new AssignedEntity(practitioner), templateId));
            }
        };
        this._self.prototype = proto;
        break;
    case 'Claim':
        var claim = resource;

        this._self = {
            templateId: function (node) {
                templateId.push(node.attributes.root);
            }
        };
        this._self.prototype = proto;
        break;
    case 'Procedure':
        var procedure = resource;
        this._self = {
            assignedEntity: function (node) {

                var practitioner = makeAndStore('Practitioner', null, null);

                ensureProperty.call(procedure, 'performer', true).push({
                    'actor': {
                        'reference': practitioner.id
                    }
                });
                proto.control.push(new Triplet(node, new AssignedEntity(practitioner), templateId));
            }
        };
        this._self.prototype = proto;
        break;
    case 'Encounter':
        var encounter = resource;
        this._self = {
            assignedEntity: function (node) {

                var practitioner = getResource('Practitioner', {
                    'id': 'Practitioner/' + (serial++).toString()
                });
                store2bundle(practitioner, patient.id);

                ensureProperty.call(encounter, 'participant', true).push({
                    'type': {
                        'coding': [{
                            'system': 'http://hl7.org/fhir/v3/ParticipationType',
                            'code': 'ATND',
                            'display': 'attender'
                        }]
                    },
                    'individual': {
                        'reference': practitioner.id
                    }
                });
                proto.control.push(new Triplet(node, new AssignedEntity(practitioner), templateId));
            }
        };
        this._self.prototype = proto;
        break;

    case 'Observation':
        this._self = {
            assignedEntity: function (node) {
                proto.control.push(new Triplet(node, new AssignedEntity(resource, templateId), templateId));
            }
        };
        this._self.prototype = proto;
        break;
    }

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
Performer.prototype = proto;

var Code = function (resource, propname) {
    this.originalText$ = function (node) {
        if (propname === 'notes') {
            resource[propname] = [{
                'text': text
            }];
        } else {
            resource[propname] = text;
        }
    };

    this.translation = function (node) {
        resource.coding.push(makeCode(node));
    };
};
Code.prototype = proto;

var ManufacturedMaterial = function (resource) {
    var templateId = [];

    switch (resource.resourceType) {
    case 'Medication':
        this._self = {
            templateId: function (node) {
                templateId.push(node.attributes.root);
            },
            code: function (node) {
                resource.code = {
                    'coding': [makeCode(node)]
                };
                if (node.attributes.displayName) {
                    resource.code.text = node.attributes.displayName;
                }
                proto.control.push(new Triplet(node, new Code(resource.code, 'text'), templateId));
            },

        };
        this._self.prototype = proto;
        break;
    case 'Immunization':
        this._self = {
            templateId: function (node) {
                templateId.push(node.attributes.root);
            },
            code: function (node) {
                resource.vaccineCode = {
                    'coding': [makeCode(node)]
                };
            },
            lotNumberText$: function (text) {
                resource.lotNumber = text;
            }
        };
        this._self.prototype = proto;
        break;
    }

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
ManufacturedMaterial.prototype = proto;

var ManufacturedProduct = function (resource) {
    var patient = findPatient(proto.bundle);

    switch (resource.resourceType) {
    case 'Medication':
        this._self = {
            manufacturedMaterial: function (node) {
                proto.control.push(new Triplet(node, new ManufacturedMaterial(resource)));
            },

            manufacturerOrganization: function (node) {

                var organization = getResource('Organization', {
                    'id': 'Organization/' + (serial++).toString()
                });
                store2bundle(organization, patient.id);

                resource.manufacturer = {
                    'reference': organization.id
                };
                proto.control.push(new Triplet(node, new Organization(organization)));
            }
        };
        this._self.prototype = proto;
        break;

    case 'Immunization':
        this._self = {
            manufacturedMaterial: function (node) {
                proto.control.push(new Triplet(node, new ManufacturedMaterial(resource)));
            },
            manufacturerOrganization: function (node) {

                var organization = getResource('Organization', {
                    'id': 'Organization/' + (serial++).toString()
                });
                store2bundle(organization, patient.id);

                resource.manufacturer = {
                    'reference': organization.id
                };
                proto.control.push(new Triplet(node, new Organization(organization)));
            }
        };
        break;
    }

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
ManufacturedProduct.prototype = proto;

var Consumable = function (resource) {
    var patient = findPatient(proto.bundle);

    this.manufacturedProduct = function (node) {

        switch (resource.resourceType) {
        case 'MedicationAdministration':
            var medicationAdministration = resource;

            var medication = getResource('Medication', {
                'id': 'Medication/' + (serial++).toString()
            });
            store2bundle(medication, patient.id);

            medicationAdministration.medicationReference = {
                'reference': medication.id
            };
            proto.control.push(new Triplet(node, new ManufacturedProduct(medication)));
            break;
        case 'Immunization':
            var immunization = resource;
            proto.control.push(new Triplet(node, new ManufacturedProduct(immunization)));
            break;
        }
    };
};
Consumable.prototype = proto;

var EffectiveTimeSingleValue = function (object, propertyName) {
    this.low = function (node) {
        object[propertyName] = dateFix(node.attributes.value);
    };
    this.center = function (node) {
        object[propertyName] = dateFix(node.attributes.value);
    };
};
EffectiveTimeSingleValue.prototype = proto;

var EffectiveTime = function (subType, object) {

    this.low = function (node) {
        object.start = dateFix(node.attributes.value);
    };

    this.high = function (node) {
        if (node.attributes.value) {
            object.end = dateFix(node.attributes.value);
        }
    };

    this.period = function (node) {
        object.scheduledTiming.repeat.period = node.attributes.value;
        object.scheduledTiming.repeat.periodUnits = node.attributes.unit;
    };

};
EffectiveTime.prototype = proto;

var PlayingEntity = function (allergyIntolerance) {
    this.code = function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        ensureProperty.call(allergyIntolerance, 'substance', true).push({
            'coding': [makeCode(node)]
        });
    };
    this.translation = function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        ensureProperty.call(allergyIntolerance, 'substance', true).push({
            'coding': [makeCode(node)]
        });
    };
    this.name$ = function (text) {
        if (allergyIntolerance.resourceType === 'AllergyIntolerance' || allergyIntolerance.resourceType === 'Location') {
            allergyIntolerance.name = text;
        }
    };
};
PlayingEntity.prototype = proto;

var PlayingDevice = function (device) {
    this.code = function (node) {
        ensureProperty.call(device, 'type');
        device.type = {
            'coding': [makeCode(node)]
        };
    };
};
PlayingDevice.prototype = proto;

var genericLocationHandler = function (location) {
    return {
        code: function (node) {
            location.type = {
                'coding': [makeCode(node)]
            };
        },
        addr: function (node) {
            location.address = {};
            proto.control.push(new Triplet(node, new Addr(location.address)));
        },
        playingEntity: function (node) {
            proto.control.push(new Triplet(node, new PlayingEntity(location)));
        }
    };
};

var ParticipantRole = function (resource, contextId) {
    var templateId = [];
    var claim;

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
    };

    this.playingEntity = function (node) {
        proto.control.push(new Triplet(node, new PlayingEntity(resource)));
    };

    this.playingDevice = function (node) {
        proto.control.push(new Triplet(node, new PlayingDevice(resource)));
    };

    this.id = function (node) {
        if (node.attributes.root) {
            if (isInContextOf('2.16.840.1.113883.10.20.1.26')) { // Policy Activity
                ensureProperty.call(resource, 'subscriberId');
                resource.subscriberId.value = node.attributes.root;
            } else {
                ensureProperty.call(resource, 'identifier', true).push({
                    'value': node.attributes.root
                });
            }
        }
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
ParticipantRole.prototype = proto;

var Participant = function (resource) {
    var templateId = [];

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
    };

    this.participantRole = function (node) {
        if (_.contains(templateId, '2.16.840.1.113883.10.20.1.45')) { // Location template
            var encounter = resource;
            var patient = findPatient(proto.bundle);
            var location = getResource('Location', { // Redifine resource, we working with location
                'id': 'Location/' + (serial++).toString()
            });
            store2bundle(location, patient.id);
            ensureProperty.call(encounter, 'location', true).push({
                'location': {
                    'reference': location.id
                }
            });
            proto.control.push(new Triplet(node, new ParticipantRole(location, templateId), templateId));
        } else {
            proto.control.push(new Triplet(node, new ParticipantRole(resource, templateId), templateId));
        }
    };

    this.time = function (node) {
        if (isInContextOf('2.16.840.1.113883.10.20.1.20')) { // Coverage Activity
            var coverage = resource;
            coverage.period = {};
            proto.control.push(new Triplet(node, new EffectiveTime(null, coverage.period), templateId));
        }
    };

};
Participant.prototype = proto;

var ObservationRangeValue = function (resource) {

    this.low = function (node) {
        resource.low = {
            'value': Number(node.attributes.value),
            'unit': node.attributes.unit
        };

    };

    this.high = function (node) {
        resource.high = {
            'value': Number(node.attributes.value),
            'unit': node.attributes.unit
        };
    };

};
ObservationRangeValue.prototype = proto;

var ObservationRange = function (resource) {

    this.value = function (node) {
        switch (node.attributes['xsi:type']) {
        case 'IVL_PQ':
            proto.control.push(new Triplet(node, new ObservationRangeValue(resource)));
            break;
        }
    };

    this.text$ = function (text) {
        resource.text = text;
    };

};
ObservationRange.prototype = proto;

var ReferenceRange = function (resource) {

    this.observationRange = function (node) {
        proto.control.push(new Triplet(node, new ObservationRange(resource)));
    };

};
ReferenceRange.prototype = proto;

var genericObservationHandler = function (observation, templateId) {
    return {
        id: function (node) {
            if (node.attributes.root) {
                ensureProperty.call(observation, 'identifier', true).push({
                    'value': node.attributes.root
                });
            }
        },
        code: function (node) {
            observation.code = {
                'coding': [makeCode(node)]
            };
        },
        statusCode: function (node) {
            observation.status = node.attributes.code;
        },
        text$: function (node) {
            observation.code.text = text;
        },
        effectiveTime: function (node) {
            if (node.attributes.value) {
                observation.effectiveDateTime = dateFix(node.attributes.value);
            } else {
                observation.effectivePeriod = {};
                proto.control.push(new Triplet(node, new EffectiveTime(null, observation.effectivePeriod), templateId));
            }
        },
        value: function (node) {
            switch (node.attributes['xsi:type']) {
            case 'PQ':
                observation.valueQuantity = {
                    'value': Number(node.attributes.value),
                    'unit': node.attributes.unit
                };
                break;
            case 'CD':
                if (node.attributes.code) {
                    observation.valueCodeableConcept = {
                        'coding': [makeCode(node)]
                    };
                }
                break;
            }
        },
        value$: function (text) {
            if (!(observation.valueQuantity || observation.valueCodeableConcept)) {
                observation.valueString = text;
            }
        },
        interpretationCode: function (node) {
            observation.interpretation = {
                'coding': [
                    makeCode(node)
                ]
            };
        },
        referenceRange: function (node) {
            ensureProperty.call(observation, 'referenceRange', true).push({});
            proto.control.push(new Triplet(node, new ReferenceRange(observation.referenceRange[observation.referenceRange.length - 1]), templateId));
        },
        targetSiteCode: function (node) {
            observation.bodySiteCodeableConcept = {
                'coding': [makeCode(node)]
            };
        },
        method: function (node) {
            if (node.attributes.code) {
                observation.method = {
                    'coding': [makeCode(node)]
                };
            }
        },
        performer: function (node) {
            proto.control.push(new Triplet(node, new Performer(observation), templateId));
        },
        participant: function (node) {
            proto.control.push(new Triplet(node, new Participant(observation), templateId));
        },
        entryRelationship: function (node) {
            proto.control.push(new Triplet(node, new EntryRelationship(node.attributes.typeCode, observation), templateId));
        }
    };
};

var genericConditionObservationHandler = function (condition, templateId) {
    var retval;
    switch (templateId) {
    case '2.16.840.1.113883.10.20.1.28':
        /* */
        retval = {
            code: function (node) {
                ensureProperty.call(condition, 'category');
                ensureProperty.call(condition.category, 'coding', true).push(makeCode(node));
            },
            text$: function (text) {
                //condition.notes = [{'text':text}];
                condition.notes = text;
            },
            statusCode: function (node) {
                condition.clinicalStatus = node.attributes.code;
            },
            effectiveTime: function (node) {
                if (node.attributes.value) {
                    condition.onsetDateTime = dateFix(node.attributes.value);
                } else {
                    proto.control.push(new Triplet(node, new EffectiveTime(null, ensureProperty.call(condition, 'onsetPeriod')), templateId));
                }
            },
            entryRelationship: function (node) {
                proto.control.push(new Triplet(node, new EntryRelationship(node.attributes.typeCode, condition), templateId));
            },
            value: function (node) {
                ensureProperty.call(condition, 'code');
                ensureProperty.call(condition.code, 'coding', true).push(makeCode(node));
            },
        };
        break;
    case '2.16.840.1.113883.10.20.1.55': // Severity Observation
        retval = {
            /*code: function (node) {
                ensureProperty.call(condition, 'severity');
                ensureProperty.call(condition.severity, 'coding', true).push(makeCode(node));
            },*/
            value: function (node) {
                ensureProperty.call(condition, 'severity');
                ensureProperty.call(condition.severity, 'coding', true).push(makeCode(node));
            },
            text$: function (text) {
                ensureProperty.call(condition, 'severity');
                condition.severity.text = text;
            }
        };
        break;
    case '2.16.840.1.113883.10.20.1.50': // ?
        retval = {
            /*code: function (node) {
                ensureProperty.call(condition, 'severity');
                ensureProperty.call(condition.severity, 'coding', true).push(makeCode(node));
            },*/
            value: function (node) {
                condition.stage = {
                    'coding': [makeCode(node)]
                };
            },
            text$: function (text) {
                ensureProperty.call(condition, 'stage');
                condition.stage.text = text;
            }
        };
        break;
    default:
        console.log('???');
        retval = {};
    }
    return retval;
};

var Observation = function (classCode, resource, param1, bundle, composition) {
    var templateId = [];
    var encounter;
    var diagnosticReport;
    var condition;
    var carePlan;
    var observation;

    this.templateId = function (node) {

        templateId.push(node.attributes.root);
        //Make it polymorphic
        switch (node.attributes.root) {

        case '2.16.840.1.113883.10.20.1.55': // Condition Severity observation
        case '2.16.840.1.113883.10.20.1.50': // ?
            condition = resource;

            this._self = genericConditionObservationHandler(condition, node.attributes.root);
            this._self.prototype = proto;
            break;

        case '2.16.840.1.113883.10.20.1.28': // Problem observation
            if (isInContextOf('2.16.840.1.113883.10.20.1.27')) { //Problem act
                condition = resource;

                this._self = genericConditionObservationHandler(condition, node.attributes.root);
            } else if (isInContextOf('2.16.840.1.113883.10.20.1.21')) { //Encounter
                encounter = resource;

                condition = getResource('Condition', {
                    'id': 'Condition/' + (serial++).toString(),
                    'patient': {
                        'reference': encounter.patient.reference
                    }
                });
                store2bundle(condition, encounter.patient.reference);

                ensureProperty.call(encounter, 'indication', true).push({
                    'reference': condition.id
                });

                this._self = genericConditionObservationHandler(condition, node.attributes.root);
            }
            this._self.prototype = proto;
            break;

        case '2.16.840.1.113883.3.62.3.17.1': //Goal
            if (isInContextOf('2.16.840.1.113883.10.20.1.10')) {
                condition = resource;
                carePlan = findLastResourceOfType.call(proto.bundle.entry, 'CarePlan');

                var goal = makeAndStore('Goal', null, null);
                goal.subject = {
                    'reference': carePlan.resource.subject.reference
                };

                ensureProperty.call(goal, 'addresses', true).push({
                    'reference': condition.id
                });

                ensureProperty.call(carePlan.resource, 'goal', true).push({
                    'reference': goal.id
                });

                this._self = {
                    code: function (node) {
                        ensureProperty.call(goal, 'description');
                        proto.control.push(new Triplet(node, new Code(goal, 'description'), templateId));
                    },
                    effectiveTime: function (node) {
                        if (node.attributes.value) {
                            goal.targetDate = dateFix(node.attributes.value);
                        } else {
                            condition.targetDate = {};
                            proto.control.push(new Triplet(node, new EffectiveTimeSingleValue(goal, 'targetDate'), templateId));
                        }
                    },
                    entryRelationship: function (node) {
                        proto.control.push(new Triplet(node, new EntryRelationship(null, goal), templateId));
                    },
                };
                this._self.prototype = proto;
            } else {
                console.log('Bug ?');
            }
            break;

        case '2.16.840.1.113883.10.20.1.31': //Observation?
            if (isInContextOf('2.16.840.1.113883.10.20.1.32')) { //Lab Results
                diagnosticReport = resource;

                observation = makeAndStoreObservation(findPatient(proto.bundle));
                ensureProperty.call(diagnosticReport, 'result', true).push({
                    'reference': observation.id
                });

                this._self = genericObservationHandler(observation, templateId);
                this._self.prototype = proto;
            }

            break;
        }

    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };

};
Observation.prototype = proto;

var Product = function (medicationOrder) {
    var patient = findPatient(proto.bundle);

    this.manufacturedProduct = function (node) {

        var medication = getResource('Medication', {
            'id': 'Medication/' + (serial++).toString()
        });
        store2bundle(medication, patient.id);

        medicationOrder.medicationReference = {
            'reference': medication.id
        };
        proto.control.push(new Triplet(node, new ManufacturedProduct(medication)));
    };
};
Product.prototype = proto;

var Author = function (resource) {
    var patient = findPatient(proto.bundle);

    this.assignedAuthor = function (node) {

        var practitioner = getResource('Practitioner', {
            'id': 'Practitioner/' + (serial++).toString()
        });
        store2bundle(practitioner, patient.id);

        if (resource.resourceType === 'MedicationOrder') {
            var medicationOrder = resource;
            medicationOrder.prescriber = {
                'reference': practitioner.id
            };
        } else if (resource.resourceType === 'MedicationAdministration') {
            var medicationAdministration = resource;
            medicationAdministration.practitioner = {
                'reference': practitioner.id
            };
        }
        proto.control.push(new Triplet(node, new AssignedEntity(practitioner)));
    };

};
Author.prototype = proto;

var Supply = function (resource) {
    var templateId = [];

    this.templateId = function (node) {
        var patient;

        templateId.push(node.attributes.root);

        switch (node.attributes.root) {
        case '2.16.840.1.113883.10.20.1.34': //Supply Activity -> MedicationAdministration

            patient = findPatient(proto.bundle);
            var medicationAdministration = makeAndStore('MedicationAdministration', patient, null);

            this._self = {

                statusCode: function (node) {
                    // TODO Recode?
                    medicationAdministration.status = node.attributes.code;
                },

                effectiveTime: function (node) {
                    medicationAdministration.effectiveTimeDateTime = dateFix(node.attributes.value);
                },

                // This is for MedicationDispense
                /*repeatNumber: function (node) {
                    ensureProperty.call(medicationAdministration, 'dispense').numberOfRepeatsAllowed = Number(node.attributes.value);
                },*/

                quantity: function (node) {
                    medicationAdministration.dosage = {
                        'quantity': {
                            'value': Number(node.attributes.value)
                        }
                    };
                    /*ensureProperty.call(medicationAdministration, 'dosage', true).push({
                        'quantity': {
                            'value': Number(node.attributes.value)
                        }
                    });*/
                },

                product: function (node) {
                    proto.control.push(new Triplet(node, new Product(medicationAdministration)));
                },

                /* TODO Find out semantic of this
                this.performer = function(node) {
                };*/

                author: function (node) {
                    proto.control.push(new Triplet(node, new Author(medicationAdministration)));
                },

                /* TODO Wrapper for additional instructions
                this.entryRelationship = function(node) {
                };*/
            };
            this._self.prototype = proto;
            break;
        }
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };

};
Supply.prototype = proto;

var genericProcedureHandlder = function (procedure) {
    if (!procedure) {
        console.log(JSON.stringify(proto.control, null, ' '));
    }
    return {
        id: function (node) {
            {
                ensureProperty.call(procedure, 'identifier', true).push({
                    'value': node.attributes.root
                });
            }
        },
        code: function (node) {
            procedure.code = {
                'coding': [makeCode(node)]
            };
        },
        statusCode: function (node) {
            procedure.status = node.attributes.code;
        },
        effectiveTime: function (node) {
            procedure.performedDateTime = dateFix(node.attributes.value);
        },
        targetSiteCode: function (node) {
            ensureProperty.call(procedure, 'bodySite', true).push({
                'coding': [makeCode(node)]
            });
        },
        specimen: function (node) {
            //TODO how to make a logical link between procedure and specimen?
        },
        performer: function (node) {
            proto.control.push(new Triplet(node, new Performer(procedure)));
        },
        participant: function (node) {
            var patient = findPatient(proto.bundle);

            var device = getResource('Device', {
                'id': 'Device/' + (serial++).toString(),
                'patient': {
                    'reference': patient.id
                }
            });
            store2bundle(device, patient.id);

            ensureProperty.call(procedure, 'used', true).push({
                'reference': device.id
            });
            proto.control.push(new Triplet(node, new Participant(device)));
        }
    };
};

var Procedure = function (resource) {
    var templateId = [];

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
        switch (node.attributes.root) {
            default: this._self = genericProcedureHandlder(resource);
            this._self.prototype = proto;
            break;
        }
    };

    this.code = function (node) {
        resource.code = {
            'coding': [makeCode(node)]
        };
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
Procedure.prototype = proto;

var EntryRelationshipMedication = function (typeCode, medicationAdministration) {
    var _medicationAdministration = medicationAdministration;

    this.observation = function (node) {
        var _patient = findPatient(proto.bundle);

        var condition = getResource('Condition', {
            'id': 'Condition/' + (serial++).toString(),
            'patient': {
                'reference': _patient.id
            }
        });
        store2bundle(condition, _patient.id);

        var medicationOrder = findResource.call(proto.bundle.entry, _medicationAdministration.prescription.reference);
        if (medicationOrder) {
            medicationOrder.reasonReference = {
                'reference': condition.id
            };
        }

        proto.control.push(new Triplet(node, new Observation(node.attributes.classCode, condition, null)));
    };

    this.supply = function (node) {

        proto.control.push(new Triplet(node, new Supply(medicationAdministration)));
    };

};
EntryRelationshipMedication.prototype = proto;

var EntryRelationshipAllergyIntolerance = function (typeCode, allergyIntolerance) {

    this.observation = function (node) {
        var reaction = ensureProperty.call(allergyIntolerance, 'reaction', true);
        if (reaction.length === 0) {
            reaction.push({});
        }
        proto.control.push(new Triplet(node, new Observation(node.attributes.classCode, allergyIntolerance, allergyIntolerance.reaction[0])));
    };

};
EntryRelationshipAllergyIntolerance.prototype = proto;

var EntryRelationship = function (typeCode, resource) {

    this.observation = function (node) {
        proto.control.push(new Triplet(node, new Observation(node.attributes.classCode, resource)));
    };

    this.act = function (node) {
        proto.control.push(new Triplet(node, new Act(resource)));
    };

    this.procedure = function (node) {
        proto.control.push(new Triplet(node, new Procedure(resource)));
    };

};
EntryRelationship.prototype = proto;

var genericCommentHandler = function (resource, propname) {
    //Ignore everything but text
    return {
        text$: function (text) {
            resource[propname] = text;
        }
    };
};

var Act = function (resource) {
    var templateId = [];
    var carePlan;
    var condition;
    var goal;
    var procedureRequest;

    this.templateId = function (node) {
        templateId.push(node.attributes.root);

        switch (node.attributes.root) {
        case '2.16.840.1.113883.10.20.1.27': //Problem act
            var clinicalImpression = resource;

            condition = getResource('Condition', {
                'id': 'Condition/' + (serial++).toString(),
                'patient': {
                    'reference': clinicalImpression.patient.reference
                }
            });
            store2bundle(condition, clinicalImpression.patient.reference);

            ensureProperty.call(clinicalImpression, 'problem', true).push({
                'reference': condition.id
            });

            this._self = {
                entryRelationship: function (node) {
                    proto.control.push(new Triplet(node, new EntryRelationship(node.attributes.typeCode, condition), templateId));

                },
                id: function (node) {
                    if (node.attributes.root) {
                        ensureProperty.call(condition, 'identifier', true).push({
                            'value': node.attributes.root
                        });
                    }
                },
                code: function (node) {
                    if (!node.attributes.nullFlavor) {
                        condition.code = {
                            'coding': [makeCode(node)]
                        };
                    }
                },
                statusCode: function (node) {
                    condition.clinicalStatus = node.attributes.code;
                },
                effectiveTime: function (node) {
                    condition.onsetPeriod = {};
                    proto.control.push(new Triplet(node, new EffectiveTime(null, condition.onsetPeriod), templateId));
                }
            };
            this._self.prototype = proto;
            break;
        case '2.16.840.1.113883.3.62.3.18.1':
            goal = resource;

            procedureRequest = makeAndStore('ProcedureRequest', null, null);
            procedureRequest.subject = {
                'reference': goal.subject.reference
            };

            ensureProperty.call(goal, 'addresses', true).push({
                'reference': procedureRequest.id
            });
            this._self = {
                code: function (node) {
                    procedureRequest.code = {
                        'coding': [makeCode(node)]
                    };
                    ensureProperty.call(procedureRequest, 'notes');
                    proto.control.push(new Triplet(node, new Code(procedureRequest, 'notes'), templateId));

                },
                effectiveTime: function (node) {
                    procedureRequest.timingDateTime = {};
                    proto.control.push(new Triplet(node, new EffectiveTimeSingleValue(procedureRequest, 'timingDateTime'), templateId));
                }
            };
            this._self.prototype = proto;
            break;

        case '2.16.840.1.113883.10.20.1.40': // Comment
            if (resource && resource.resourceType === 'ClinicalImpression') {
                this._self = genericCommentHandler(resource, 'summary');
                this._self.prototype = proto;
            }
            break;

        case '2.16.840.1.113883.10.20.1.20': // Coverage
            this._self = {
                entryRelationship: function (node) {
                    proto.control.push(new Triplet(node, new EntryRelationship(null, resource), templateId));
                }
            };
            this._self.prototype = proto;
            break;

        case '2.16.840.1.113883.10.20.1.26': // Policy Activity
            var coverage = makeAndStore('Coverage', null, null);
            var patient = findPatient(proto.bundle);
            coverage.subscriber = {
                'reference': patient.id
            }; // TODO - not sure if this is correct
            this._self = {
                id: function (node) {
                    coverage.group = node.attributes.root;
                },
                participant: function (node) {
                    proto.control.push(new Triplet(node, new Participant(coverage), templateId));
                }
            };
            this._self.prototype = proto;
            break;
        }
    };

    if (resource && resource.resourceType === 'CarePlan') {
        carePlan = resource;
        condition = makeAndStore('Condition', null, null);
        condition.patient = {
            'reference': carePlan.subject.reference
        };
        /*getResource('Condition', {
            'id': 'Condition/' + (serial++).toString(),
            'patient': {
                'reference': carePlan.subject.reference
            }
        });
        store2bundle(condition, carePlan.subject.reference);*/

        ensureProperty.call(carePlan, 'addresses', true).push({
            'reference': condition.id
        });

        this._self = {
            code: function (node) {
                condition.code = {
                    'coding': [makeCode(node)]
                };
            },
            effectiveTime: function (node) {
                if (node.attributes.value) {
                    condition.onsetDateTime = dateFix(node.attributes.value);
                } else {
                    condition.onsetDateTime = {};
                    proto.control.push(new Triplet(node, new EffectiveTimeSingleValue(condition, 'onsetDateTime'), templateId));
                }
            },
            priorityCode: function (node) {
                condition.severity = {
                    'coding': [makeCode(node)]
                };
            },
            entryRelationship: function (node) {
                proto.control.push(new Triplet(node, new EntryRelationship(null, condition), templateId));
            }
        };
        this._self.prototype = proto;
    }

    this.obj = function () {
        return (this._self) ? this._self : this;
    };

};
Act.prototype = proto;

var RelatedSubject = function (familyMemberHistory) {

    this.code = function (node) {
        familyMemberHistory.relationship = {
            'coding': [makeCode(node)]
        };
    };

    this.subject = function (node) {
        proto.control.push(new Triplet(node, new Subject(familyMemberHistory)));
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
RelatedSubject.prototype = proto;

var DeepCodeExtractor = function (codes) {
    this.translation = function (node) {
        codes.coding.push(makeCode(node));
    };
};
DeepCodeExtractor.prototype = proto;

var Encounter = function (resource) {
    var templateId = [];

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
        switch (node.attributes.root) {
        case '2.16.840.1.113883.10.20.1.21': //Encounter
            var patient = resource;

            var encounter = getResource('Encounter', {
                'id': 'Encounter/' + (serial++).toString(),
                'patient': {
                    'reference': patient.id
                }
            });
            store2bundle(encounter, patient.id);

            //ensureProperty.call(carePlencounteran, 'activity',true).push({'reference':procedureRequest.id});
            this._self = {
                id: function (node) {
                    if (node.attributes.root) {
                        ensureProperty.call(encounter, 'identifier', true).push({
                            'value': node.attributes.root
                        });
                    }
                },
                code: function (node) {
                    encounter.type = [{
                        'coding': [makeCode(node)]
                    }];
                    proto.control.push(new Triplet(node, new DeepCodeExtractor(encounter.type[encounter.type.length - 1]), templateId));
                },
                effectiveTime: function (node) {
                    encounter.period = {};
                    if (node.attributes.value) {
                        encounter.period.end = dateFix(node.attributes.value);
                    } else {
                        proto.control.push(new Triplet(node, new EffectiveTime(null, encounter.period), templateId));
                    }
                },
                participant: function (node) {
                    proto.control.push(new Triplet(node, new Participant(encounter), templateId));
                },
                performer: function (node) {
                    proto.control.push(new Triplet(node, new Performer(encounter), templateId));
                },
                entryRelationship: function (node) {
                    proto.control.push(new Triplet(node, new EntryRelationship(null /* scheduled to remove */ , encounter), templateId));
                }
            };
            this._self.prototype = proto;
            break;
        }
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
Encounter.prototype = proto;

var Subject = function (familyMemberHistory) {

    this.relatedSubject = function (node) {
        proto.control.push(new Triplet(node, new RelatedSubject(familyMemberHistory)));
    };

    this['sdtc:id'] = function (node) {
        proto.control.push(new Triplet(node, dummy)); // Have no idea what is this
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
Subject.prototype = proto;

//The Family History Oranizer associates a set of observations with a family member.
var Organizer = function (resource) {
    var templateId = [];
    var patient = findPatient(proto.bundle);

    this.templateId = function (node) {
        templateId.push(node.attributes.root);

        switch (node.attributes.root) {
        case '2.16.840.1.113883.10.20.1.32': //Laboratory results

            var diagnosticReport = getResource('DiagnosticReport', {
                'id': 'DiagnosticReport/' + (serial++).toString(),
                'subject': {
                    'reference': patient.id
                }
            });
            store2bundle(diagnosticReport, patient.id);

            this._self = {
                code: function (node) {
                    diagnosticReport.category = {
                        'coding': [makeCode(node)]
                    };
                },
                statusCode: function (node) {
                    diagnosticReport.status = node.attributes.code;
                },
                effectiveTime: function (node) {
                    diagnosticReport.issued = dateFix(node.attributes.value);
                },
                component: function (node) {
                    proto.control.push(new Triplet(node, new Component(diagnosticReport), templateId));
                }
            };
            this._self.prototype = proto;
            break;
        }
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
Organizer.prototype = proto;

var Entry = function (resource) {
    var templateId = [];

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
    };

    //Allergies, Adverse Reactions, Alerts
    this.act = function (node) {
        var patient;
        if (isInContextOf('2.16.840.1.113883.10.20.1.11' /*Problem Section*/ )) {
            if (!resource || resource.resourceType !== 'ClinicalImpression') {
                patient = findPatient(proto.bundle);

                proto.control.push(new Triplet(node, new Act(patient), templateId));
            } else {
                proto.control.push(new Triplet(node, new Act(resource), templateId));
            }
        } else {
            proto.control.push(new Triplet(node, new Act(resource), templateId));
        }
    };

    //Part of FAIMLY HSTORY
    this.organizer = function (node) {
        proto.control.push(new Triplet(node, new Organizer(), templateId));
    };

    this.supply = function (node) {
        proto.control.push(new Triplet(node, new Supply(resource), templateId));
    };

    this.observation = function (node) {
        proto.control.push(new Triplet(node, new Observation(node.attributes.classCode, resource), templateId));
    };

    this.encounter = function (node) {
        proto.control.push(new Triplet(node, new Encounter(resource), templateId));
    };

    this.procedure = function (node) {
        var proceduresSection = '2.16.840.1.113883.10.20.1.12';
        if (isInContextOf([proceduresSection])) {
            var patient = findPatient(proto.bundle);

            var procedure = makeAndStore('Procedure', null, patient);

            proto.control.push(new Triplet(node, new Procedure(procedure), templateId));
        } else {
            proto.control.push(new Triplet(node, new Procedure(resource), templateId));
        }
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };

};
Entry.prototype = proto;

var Section = function (resource) {
    var templateId = [];
    var patient;

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
        switch (node.attributes.root) {
        case '2.16.840.1.113883.10.20.1.10': //CCD Plan of care section
            patient = findPatient(proto.bundle);

            resource = makeAndStore('CarePlan', null, patient);

            break;
        case '2.16.840.1.113883.10.20.1.11': //CCD Problems Section
            patient = findPatient(proto.bundle);

            resource = getResource('ClinicalImpression', {
                'id': 'ClinicalImpression/' + (serial++).toString(),
                'patient': {
                    'reference': patient.id
                }
            });
            store2bundle(resource, patient.id);

            break;
            /*case '2.16.840.1.113883.10.20.1.8': //Medications Section
                patient = findPatient(proto.bundle);

                resource = getResource('MedicationAdministration', {
                    'id': 'MedicationAdministration/' + (serial++).toString(),
                    'patient': {
                        'reference': patient.id
                    }
                });
                store2bundle(resource, patient.id);

                break;*/
        case '2.16.840.1.113883.10.20.1.3': //Encounters
            resource = findPatient(proto.bundle);

            break;
        case '2.16.840.1.113883.10.20.1.9': //Insurance Eligibility
            resource = findPatient(proto.bundle);

            break;
        }
    };

    this.entry = function (node) {
        proto.control.push(new Triplet(node, new Entry(resource), templateId));
    };

    this.obj = function () {
        return (this._self) ? this._self : this;
    };
};
Section.prototype = proto;

var StructuredBody = function (resource) {

    this.component = function (node) {
        proto.control.push(new Triplet(node, new Component(resource)));
    };

};
StructuredBody.prototype = proto;

var Component = function (resource) {

    this.structuredBody = function (node) {
        proto.control.push(new Triplet(node, new StructuredBody(resource)));
    };

    this.section = function (node) {
        proto.control.push(new Triplet(node, new Section(resource)));
    };

    this.observation = function (node) {
        proto.control.push(new Triplet(node, new Observation(node.attributes.classCode, resource, {})));
    };

};
Component.prototype = proto;

var Name = function (name) {
    var _name = name;

    this.given$ = function (text) {
        if (!_name.given) {
            _name.given = [];
        }
        _name.given.push(text);
    };

    this.family$ = function (text) {
        if (!_name.family) {
            _name.family = [];
        }
        _name.family.push(text);
    };
};
Name.prototype = proto;

var SomeWithName = function (some) {
    var _some = some;

    this.name = function (node) {
        if (!_some.name) {
            _some.name = [];
        }
        var name = {};
        if (node.attributes.use) {
            name.use = recodeNameUse(node.attributes.use);
        }
        _some.name.push(name);

        proto.control.push(new Triplet(node, new Name(name)));
    };
};
SomeWithName.prototype = proto;

var Place = function (address) {
    var _address = address;

    this.addr = function (node) {
        proto.control.push(new Triplet(node, new Addr(_address)));
    };
};
Place.prototype = proto;

var BirthPlace = function (address) {
    var _address = address;

    this.place = function (node) {
        proto.control.push(new Triplet(node, new Place(_address)));
    };
};
BirthPlace.prototype = proto;

var LanguageCommunication = function (communication) {
    var _communication = communication;

    this.languageCode = function (node) {
        _communication.language = {
            'coding': [{
                'code': node.attributes.code
            }]
        };
    };

    this.preferenceInd = function (node) {
        _communication.preferred = node.attributes.value;
    };
};
LanguageCommunication.prototype = proto;

var GuardianPerson = function (contact) {
    SomeWithName.call(this, contact);
};
GuardianPerson.prototype = new SomeWithName(null);

var Guardian = function (contact) {

    this.code = function (node) {
        contact.relationship = [{
            'coding': [{
                'system': 'urn:oid:' + node.attributes.codeSystem,
                'code': node.attributes.code,
                'display': node.attributes.displayName
            }]
        }];
    };

    this.addr = function (node) {
        contact.address = {};
        proto.control.push(new Triplet(node, new Addr(contact.address)));
    };

    this.telecom = function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        ensureProperty.call(contact, 'telecom', true).push(recodeTelecom(node));
    };

    this.guardianPerson = function (node) {
        proto.control.push(new Triplet(node, new GuardianPerson(contact)));
    };

};
Guardian.prototype = proto;

var Patient = function (patient) {
    SomeWithName.call(this, patient);

    var _patient = patient;

    this.administrativeGenderCode = function (node) {
        _patient.gender = recodeGender(node.attributes.code);
    };

    this.birthTime = function (node) {
        _patient.birthDate = dateFix(node.attributes.value);
    };
    this.maritalStatusCode = function (node) {
        _patient.maritalStatus = {
            coding: [makeCode(node)]
        };
    };
    this.religiousAffiliationCode = function (node) {
        ensureProperty.call(_patient, 'extension', true).push({
            'url': 'http://hl7.org/fhir/StructureDefinition/us-core-religion',
            'valueCodeableConcept': {
                'coding': [{
                    'system': 'urn:oid:' + node.attributes.codeSystem,
                    'code': node.attributes.code,
                    'display': node.attributes.displayName
                }]
            }
        });
    };
    this.raceCode = function (node) {
        ensureProperty.call(_patient, 'extension', true).push({
            'url': 'http://hl7.org/fhir/Profile/us-core#race',
            'valueCodeableConcept': {
                'coding': [{
                    'system': 'urn:oid:' + node.attributes.codeSystem,
                    'code': node.attributes.code,
                    'display': node.attributes.displayName
                }]
            }
        });
    };
    this.ethnicGroupCode = function (node) {
        ensureProperty.call(_patient, 'extension', true).push({
            'url': 'http://hl7.org/fhir/Profile/us-core#ethnicity',
            'valueCodeableConcept': {
                'coding': [{
                    'system': 'urn:oid:' + node.attributes.codeSystem,
                    'code': node.attributes.code,
                    'display': node.attributes.displayName
                }]
            }
        });
    };

    this.guardian = function (node) {
        var contact = {};
        ensureProperty.call(_patient, 'contact', true).push(contact);
        proto.control.push(new Triplet(node, new Guardian(contact)));
    };

    this.birthplace = function (node) {
        var address = {};
        ensureProperty.call(_patient, 'extension', true).push({
            'url': 'http://hl7.org/fhir/StructureDefinition/birthPlace',
            'valueAddress': address
        });
        proto.control.push(new Triplet(node, new BirthPlace(address)));
    };
    this.languageCommunication = function (node) {
        var communication = {};
        ensureProperty.call(_patient, 'communication', true).push(communication);
        proto.control.push(new Triplet(node, new LanguageCommunication(communication)));
    };
};
Patient.prototype = new SomeWithName(null);

var AssignedPerson = function (patient) {
    SomeWithName.call(this, patient);
};
AssignedPerson.prototype = new SomeWithName(null);

var Addr = function (address_) {
    var address = address_;

    this.streetAddressLine$ = function (text) {
        if (!address.line) {
            address.line = [];
        }
        address.line.push(text);
    };

    this.city$ = function (text) {
        address.city = text;
    };

    this.state$ = function (text) {
        address.state = text;
    };

    this.postalCode$ = function (text) {
        address.postalCode = text;
    };

    this.country$ = function (text) {
        address.country = text;
    };

};
Addr.prototype = proto;

var PatientRole = function (patient) {
    var _patient = patient;

    this.id = function (node) {
        if (node.attributes.root) {
            if (!_patient.identifier) {
                _patient.identifier = [];
            }
            _patient.identifier.push({
                'system': 'urn:oid:' + node.attributes.root,
                'value': node.attributes.extension
            });
        }
    };

    this.addr = function (node) {
        var address = {};
        if (node.attributes.use) {
            address.use = recodeAddrUse(node.attributes.use);
        }
        if (!_patient.address) {
            _patient.address = [address];
        }
        proto.control.push(new Triplet(node, new Addr(address)));
    };

    this.telecom = function (node) {
        if (node.attributes.nullFlavor) {
            return;
        }
        ensureProperty.call(_patient, 'telecom', true).push(recodeTelecom(node));
    };

    this.patient = function (node) {
        proto.control.push(new Triplet(node, new Patient(_patient)));
    };

    this.providerOrganization = function (node) {

        var organization = getResource('Organization', {
            'id': 'Organization/' + (serial++).toString()
        });
        store2bundle(organization, _patient.id);

        _patient.managingOrganization = {
            'reference': organization.id
        };
        proto.control.push(new Triplet(node, new Organization(organization)));
    };
};
PatientRole.prototype = proto;

var RecordTarget = function (patient) {

    this.patientRole = function (node) {
        proto.control.push(new Triplet(node, new PatientRole(patient)));
    };
};
RecordTarget.prototype = proto;

var ClinicalDocument = function (patientId, parserStream) {
    var templateId = [];

    this.patientId = patientId;

    proto.bundle = {
        'resourceType': 'Bundle'
    };

    proto.composition = {
        'resourceType': 'Composition',
        'id': 'Composition/' + (serial++).toString(),
        'section': []
    };

    var patients = [];

    proto.bundle.entry = [{
        'resource': proto.composition
    }];

    this.id = function (node) {
        proto.bundle['id'] = 'urn:hl7ii:' + node.attributes.root + ((node.attributes.extension) ? ':' + node.attributes.extension : '');
    };

    this.templateId = function (node) {
        templateId.push(node.attributes.root);
    };

    this.code = function (node) {
        proto.composition['type'] = {
            'coding': [makeCode(node), {
                'system': node.attributes.codeSystemName,
                'code': node.attributes.code
            }]
        };
    };

    this.title$ = function (node) {
        proto.composition['title'] = text;
    };

    this.recordTarget = function (node) {

        var patient = {
            'resourceType': 'Patient',
            'id': 'Patient/' + ((this.patientId) ? this.patientId : (serial++).toString())
        };
        patients.push(patient);

        if (proto.composition) {
            proto.composition.subject = {
                'reference': patient.id
            };
        }

        proto.bundle.entry.push({
            resource: patient
        });

        proto.control.push(new Triplet(node, new RecordTarget(patient)));
    };

    /* TODO try to capture non-clinical information like
    author,
    dataEneterer,
    informant,
    custodian,
    informationRecipient,
    legalAuthenticator,
    authenticator & documentationOf  */

    this.component = function (node) {
        // http://cdatools.org/infocenter/index.jsp?topic=%2Forg.openhealthtools.mdht.uml.cda.ccd.doc%2Fclasses%2FContinuityOfCareDocument.html
        var ccdTemplateId = '2.16.840.1.113883.10.20.1' /* Continuity Of Care Document */ ;
        if (_.contains(templateId, ccdTemplateId)) {
            proto.control.push(new Triplet(node, new Component(null)));
        } else {
            parserStream.error = new Error('Not a CCD document');
        }
    };

    this.get = function () {
        return proto.bundle;
    };
};
ClinicalDocument.prototype = proto;

var Start = function (patientId, parserStream) {
    var clinicalDocument = new ClinicalDocument(patientId, parserStream);

    this.ClinicalDocument = function (node) {
        proto.control.push(new Triplet(node, clinicalDocument));
    };

    this.get = function () {
        return fixup(clinicalDocument.get());
    };
};
Start.prototype = proto;

var fixup = function (bundle) {
    _.forEach(bundle.entry, function (entry) {
        switch (entry.resource.resourceType) {
        case 'Condition':
            if (entry.resource.hasOwnProperty('onsetPeriod')) {
                if (entry.resource.onsetPeriod.end && entry.resource.onsetPeriod.start === entry.resource.onsetPeriod.end) {
                    //collapse to a single value
                    entry.resource.onsetDateTime = entry.resource.onsetPeriod.start;
                    delete entry.resource.onsetPeriod;
                    //} else if (entry.resource.onsetPeriod.end && !entry.resource.onsetPeriod.start) {
                    //    entry.resource.onsetDateTime = entry.resource.onsetPeriod.end;
                    //    delete entry.resource.onsetPeriod;
                    //} else if (!entry.resource.onsetPeriod.end && entry.resource.onsetPeriod.start) {
                    //    entry.resource.onsetDateTime = entry.resource.onsetPeriod.start;
                    //    delete entry.resource.onsetPeriod;
                } else if (!entry.resource.onsetPeriod.end && !entry.resource.onsetPeriod.start) {
                    delete entry.resource.onsetPeriod;
                }
            }
            break;
        }
    });
    return bundle;
};

var text;

var Transform = require("stream").Transform;
var util = require("util");

function CcdParserStream(patientId) {
    Transform.call(this, {
        "objectMode": true
    }); // invoke Transform's constructor, expected result is object

    var self = this;

    /* Clean module variables */
    this.last = new Start(patientId, this);
    proto.control = [new Triplet({}, this.last)];
    text = null;
    this.error = null;
    serial = 1;
    /* */

    // "Data cruncher" --------------------------
    // stream usage
    // takes the same options as the parser
    this.saxStream = require("sax").createStream(true, {
        'trim': true
    });

    this.saxStream.on("error", function (e) {

        // unhandled errors will throw, since this is a proper node
        // event emitter.
        if (!self.error) {
            self.error = e;
        }

        // Ignore all the rest

        // clear the error & trying to resume. all input data will be discarded
        //this._parser.error = null;
        //this._parser.resume();
    });

    this.saxStream.on("opentag", function (node) {

        if (self.error) {
            return;
        }

        //console.log("opentag", node.name, this._parser.line);
        //Skip node if it contains nullFlavor attribute
        if (true /*!node.attributes.nullFlavor*/ ) {
            //Peek item from top of stack
            var doc = _.last(proto.control);
            //Trying to get processing handler
            if (doc) {
                text = ''; //Reset text
                var entity = doc.entity.obj();
                var handler = entity[node.name];
                if (handler) {
                    handler.call(entity, node); //Process node
                } else {
                    if (!node.isSelfClosing && !entity[node.name + '$']) {
                        //console.log("pushing dummy ", node.name);
                        proto.control.push(new Triplet(node, dummy));
                    }
                }
            } else {
                console.log('++++', node); // Error?
            }
        } else {
            proto.control.push(new Triplet(node, dummy));
        }

    });

    this.saxStream.on("closetag", function (tagname) {

        if (self.error) {
            return;
        }

        //console.log("closetag", tagname);
        //Peek item from top of stack
        var doc = _.last(proto.control);
        if (doc) {
            //Trying to get processing handler
            var handler = doc.entity.obj()[tagname + '$'];
            if (handler) {
                handler(text); //Process node
            }
        } else {
            console.log('----', tagname); // Error?
        }
        //Check the 'control stack' and remove top itemm if we done
        if (_.last(proto.control).node.name === tagname) {
            proto.control.pop();
        }

    });

    /* No need in this
    this.saxStream.on("attribute", function (node) {
      console.log("attribute", node);
    });*/

    //Collect tag's text if any
    this.saxStream.on("text", function (node) {
        //console.log("text", node);
        text = node;
    });

    //We are done, print result
    this.saxStream.on("end", function () {
        //console.timeEnd('sax'); //Done, check the time
        //console.log(proto.control.length);
        //console.log(JSON.stringify(makeTransactionalBundle(last.get(), 'http://localhost:8080/fhir/base'), null, ' '));
    });

    //No work yet done before this point, just definitions
    //console.time('sax');    
}

util.inherits(CcdParserStream, Transform); // inherit Transform

/**
 * @Function _transform
 * Define standart Transform Stream's function _transform
 * @param (String) line - input line
 * @param (String) encoding - encoding (not used now)
 * @param cb - callback to notify that we are done with a row
 */
CcdParserStream.prototype._transform = function (line, encoding, cb) {
    this.saxStream.write(line);
    cb();
};

/**
 * @Function _flush
 * Define standart Transform Stream's function _flush
 * Normally in should push parsed result (or error) to a pipe
 * @param cb - callback to notify that we are done
 */
CcdParserStream.prototype._flush = function (cb) {

    if (this.error) {
        this.push(this.error);
    } else {
        //this.push( makeTransactionalBundle( last.get(), "http://localhost:8080/fhir") );
        this.push(this.last.get());
    }
    cb();
};

//Just create a copy of input file while producing data organized in a bundle
//fs.createReadStream(__dirname + '/test/artifacts/bluebutton-01-original.xml')
//    .pipe(new CcdParserStream())
//    .pipe(fs.createWriteStream("file-copy.xml"));

module.exports = CcdParserStream;
