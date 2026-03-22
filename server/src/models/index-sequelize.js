const { Sequelize, Op } = require('sequelize');
const { sequelize } = require('../config/sequelize');

const UserModel = require('./sequelize/User');
const ComplaintModel = require('./sequelize/Complaint');
const CategoryModel = require('./sequelize/Category');
const NotificationModel = require('./sequelize/Notification');
const FeedbackModel = require('./sequelize/Feedback');
const QTableModel = require('./sequelize/QTable');
const SLAModelModel = require('./sequelize/SLAModel');

const User = UserModel(sequelize);
const Complaint = ComplaintModel(sequelize);
const Category = CategoryModel(sequelize);
const Notification = NotificationModel(sequelize);
const Feedback = FeedbackModel(sequelize);
const QTable = QTableModel(sequelize);
const SLAModel = SLAModelModel(sequelize);

User.hasMany(Complaint, { foreignKey: 'studentId', as: 'complaints' });
Complaint.belongsTo(User, { foreignKey: 'studentId', as: 'student', targetKey: 'id' });
Complaint.belongsTo(User, { foreignKey: 'assignedTo', as: 'worker', targetKey: 'id' });
Complaint.belongsTo(User, { foreignKey: 'assignedBy', as: 'assigner', targetKey: 'id' });
Complaint.belongsTo(User, { foreignKey: 'escalatedBy', as: 'escalator', targetKey: 'id' });

Notification.belongsTo(User, { foreignKey: 'userId', as: 'user', targetKey: 'id' });
Notification.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint', targetKey: 'id' });

Feedback.belongsTo(Complaint, { foreignKey: 'complaintId', as: 'complaint', targetKey: 'id' });
Feedback.belongsTo(User, { foreignKey: 'studentId', as: 'student', targetKey: 'id' });
Feedback.belongsTo(User, { foreignKey: 'workerId', as: 'worker', targetKey: 'id' });

const POPULATE_MAP = {
  User: {},
  Complaint: {
    studentId: { as: 'student', model: User },
    assignedTo: { as: 'worker', model: User },
    assignedBy: { as: 'assigner', model: User },
    escalatedBy: { as: 'escalator', model: User }
  },
  Notification: {
    userId: { as: 'user', model: User },
    complaintId: { as: 'complaint', model: Complaint }
  },
  Feedback: {
    complaintId: { as: 'complaint', model: Complaint },
    studentId: { as: 'student', model: User },
    workerId: { as: 'worker', model: User }
  },
  Category: {},
  QTable: {},
  SLAModel: {}
};

const normalizeIdAliases = (input) => {
  if (Array.isArray(input)) {
    return input.map((item) => normalizeIdAliases(item));
  }

  if (!input || typeof input !== 'object') {
    return input;
  }

  const output = {};
  Object.entries(input).forEach(([key, value]) => {
    output[key] = normalizeIdAliases(value);
  });

  if (output.id && !output._id) {
    output._id = output.id;
  }

  return output;
};

const parseSelectAttributes = (select) => {
  if (!select || typeof select !== 'string') {
    return undefined;
  }

  const parts = select.split(' ').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) {
    return undefined;
  }

  const include = parts.filter((p) => !p.startsWith('-')).map((p) => p.replace(/^\+/, ''));
  const exclude = parts.filter((p) => p.startsWith('-')).map((p) => p.slice(1));

  if (include.length > 0) {
    return include;
  }

  if (exclude.length > 0) {
    return { exclude };
  }

  return undefined;
};

const convertCondition = (key, value) => {
  const columnKey = key === '_id' ? 'id' : key;

  if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
    const operators = {};

    if (Object.prototype.hasOwnProperty.call(value, '$regex')) {
      const pattern = String(value.$regex || '');
      const mode = String(value.$options || '').toLowerCase();
      operators[mode.includes('i') ? Op.iLike : Op.like] = `%${pattern}%`;
    }
    if (Object.prototype.hasOwnProperty.call(value, '$gte')) operators[Op.gte] = value.$gte;
    if (Object.prototype.hasOwnProperty.call(value, '$lte')) operators[Op.lte] = value.$lte;
    if (Object.prototype.hasOwnProperty.call(value, '$gt')) operators[Op.gt] = value.$gt;
    if (Object.prototype.hasOwnProperty.call(value, '$lt')) operators[Op.lt] = value.$lt;
    if (Object.prototype.hasOwnProperty.call(value, '$ne')) operators[Op.ne] = value.$ne;
    if (Object.prototype.hasOwnProperty.call(value, '$in')) operators[Op.in] = value.$in;
    if (Object.prototype.hasOwnProperty.call(value, '$nin')) operators[Op.notIn] = value.$nin;

    if (Object.keys(operators).length > 0) {
      if (columnKey.includes('.')) {
        return Sequelize.where(Sequelize.json(columnKey), operators);
      }
      return { [columnKey]: operators };
    }
  }

  if (columnKey.includes('.')) {
    return Sequelize.where(Sequelize.json(columnKey), value);
  }

  return { [columnKey]: value };
};

const toWhereClause = (filter = {}) => {
  const source = filter?.where && typeof filter.where === 'object' ? filter.where : filter;
  const clauses = [];

  Object.entries(source || {}).forEach(([key, value]) => {
    if (key === '$or' && Array.isArray(value)) {
      clauses.push({ [Op.or]: value.map((entry) => toWhereClause(entry)).filter(Boolean) });
      return;
    }
    if (key === '$and' && Array.isArray(value)) {
      clauses.push({ [Op.and]: value.map((entry) => toWhereClause(entry)).filter(Boolean) });
      return;
    }

    const converted = convertCondition(key, value);
    if (converted) {
      clauses.push(converted);
    }
  });

  if (!clauses.length) {
    return {};
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { [Op.and]: clauses };
};

const parsePopulateSpec = (model, populateEntry) => {
  const modelMap = POPULATE_MAP[model.name] || {};

  if (typeof populateEntry === 'string') {
    const path = populateEntry.trim();
    const mapEntry = modelMap[path];
    if (!mapEntry) return null;
    return {
      path,
      include: { model: mapEntry.model, as: mapEntry.as }
    };
  }

  if (populateEntry && typeof populateEntry === 'object' && populateEntry.path) {
    const mapEntry = modelMap[populateEntry.path];
    if (!mapEntry) return null;
    const include = { model: mapEntry.model, as: mapEntry.as };
    const attrs = parseSelectAttributes(populateEntry.select);
    if (attrs) include.attributes = attrs;
    return { path: populateEntry.path, include };
  }

  return null;
};

const applyPopulateAliases = (model, entity, populatedPaths = []) => {
  if (!entity || typeof entity !== 'object') return entity;
  const modelMap = POPULATE_MAP[model.name] || {};

  populatedPaths.forEach((path) => {
    const cfg = modelMap[path];
    if (!cfg) return;
    if (entity[cfg.as] !== undefined) {
      entity[path] = entity[cfg.as];
    }
  });

  return entity;
};

class CompatQuery {
  constructor(model, rawFilter = {}, isMany = true) {
    this.model = model;
    this.isMany = isMany;
    this.rawFilter = rawFilter || {};
    this.options = {};
    this.populatedPaths = [];
    this.useLean = false;
  }

  populate(pathOrSpec, maybeSelect) {
    const entry = typeof pathOrSpec === 'string'
      ? parsePopulateSpec(this.model, { path: pathOrSpec, select: maybeSelect })
      : parsePopulateSpec(this.model, pathOrSpec);

    if (entry) {
      this.options.include = this.options.include || [];
      this.options.include.push(entry.include);
      this.populatedPaths.push(entry.path);
    }

    return this;
  }

  sort(sortObj) {
    if (sortObj && typeof sortObj === 'object') {
      this.options.order = Object.entries(sortObj).map(([key, value]) => [key === '_id' ? 'id' : key, Number(value) === 1 ? 'ASC' : 'DESC']);
    }
    return this;
  }

  skip(value) {
    this.options.offset = Number(value) || 0;
    return this;
  }

  limit(value) {
    this.options.limit = Number(value) || undefined;
    return this;
  }

  select(select) {
    const attrs = parseSelectAttributes(select);
    if (attrs) {
      this.options.attributes = attrs;
    }
    return this;
  }

  lean() {
    this.useLean = true;
    return this;
  }

  async exec() {
    const hasSequelizeOptions = Object.prototype.hasOwnProperty.call(this.rawFilter, 'where')
      || Object.prototype.hasOwnProperty.call(this.rawFilter, 'include')
      || Object.prototype.hasOwnProperty.call(this.rawFilter, 'attributes')
      || Object.prototype.hasOwnProperty.call(this.rawFilter, 'order')
      || Object.prototype.hasOwnProperty.call(this.rawFilter, 'limit')
      || Object.prototype.hasOwnProperty.call(this.rawFilter, 'offset');

    const baseOptions = hasSequelizeOptions
      ? { ...this.rawFilter }
      : { where: toWhereClause(this.rawFilter) };

    const options = {
      ...baseOptions,
      ...this.options,
      include: [...(baseOptions.include || []), ...(this.options.include || [])]
    };

    if (!options.include || options.include.length === 0) {
      delete options.include;
    }

    const result = this.isMany
      ? await this.model._origFindAll(options)
      : await this.model._origFindOne(options);

    const convertItem = (item) => {
      if (!item) return item;
      if (this.useLean) {
        const plain = item.get({ plain: true });
        applyPopulateAliases(this.model, plain, this.populatedPaths);
        return normalizeIdAliases(plain);
      }
      if (item && typeof item.setDataValue === 'function') {
        applyPopulateAliases(this.model, item.dataValues, this.populatedPaths);
      }
      return item;
    };

    if (Array.isArray(result)) {
      return result.map(convertItem);
    }

    return convertItem(result);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const buildMatchPredicate = (where) => {
  const query = where || {};
  return (row) => {
    const evaluate = (obj, clause) => {
      if (!clause || typeof clause !== 'object') return true;

      if (Array.isArray(clause[Op.and])) {
        return clause[Op.and].every((entry) => evaluate(obj, entry));
      }
      if (Array.isArray(clause[Op.or])) {
        return clause[Op.or].some((entry) => evaluate(obj, entry));
      }

      return Object.entries(clause).every(([key, value]) => {
        if (key.startsWith('Symbol(')) return true;

        const actual = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          return Object.entries(value).every(([opKey, opVal]) => {
            if (opKey === Op.gte.toString()) return actual >= opVal;
            if (opKey === Op.lte.toString()) return actual <= opVal;
            if (opKey === Op.gt.toString()) return actual > opVal;
            if (opKey === Op.lt.toString()) return actual < opVal;
            if (opKey === Op.ne.toString()) return actual !== opVal;
            if (opKey === Op.in.toString()) return Array.isArray(opVal) && opVal.includes(actual);
            if (opKey === Op.notIn.toString()) return Array.isArray(opVal) && !opVal.includes(actual);
            if (opKey === Op.like.toString() || opKey === Op.iLike.toString()) {
              const pattern = String(opVal).replaceAll('%', '').toLowerCase();
              return String(actual || '').toLowerCase().includes(pattern);
            }
            return true;
          });
        }
        return actual === value;
      });
    };

    return evaluate(row, query);
  };
};

const patchModelCompat = (model) => {
  model._origFindAll = model.findAll.bind(model);
  model._origFindOne = model.findOne.bind(model);
  model._origUpdate = model.update.bind(model);

  if (!Object.getOwnPropertyDescriptor(model.prototype, '_id')) {
    Object.defineProperty(model.prototype, '_id', {
      get() {
        return this.getDataValue('id');
      }
    });
  }

  model.prototype.toObject = function toObject() {
    return normalizeIdAliases(this.get({ plain: true }));
  };

  model.prototype.populate = async function populate(paths) {
    const include = [];
    const populatedPaths = [];

    const arr = Array.isArray(paths) ? paths : [paths];
    arr.forEach((entry) => {
      const parsed = parsePopulateSpec(model, entry);
      if (parsed) {
        include.push(parsed.include);
        populatedPaths.push(parsed.path);
      }
    });

    if (!include.length) {
      return this;
    }

    const reloaded = await model._origFindOne({ where: { id: this.id }, include });
    if (reloaded) {
      Object.assign(this.dataValues, reloaded.dataValues);
      applyPopulateAliases(model, this.dataValues, populatedPaths);
    }
    return this;
  };

  model.find = (filter = {}) => new CompatQuery(model, filter, true);
  model.findOne = (filter = {}) => new CompatQuery(model, filter, false);

  model.findById = async (id) => model._origFindOne({ where: { id } });

  model.findByIdAndUpdate = async (id, update = {}, options = {}) => {
    const row = await model._origFindOne({ where: { id } });
    if (!row) return null;

    const payload = { ...update };
    const pushOps = payload.$push;
    delete payload.$push;

    Object.entries(payload).forEach(([key, value]) => {
      if (key === '_id') return;
      row.set(key, value);
    });

    if (pushOps && typeof pushOps === 'object') {
      Object.entries(pushOps).forEach(([field, pushedValue]) => {
        const prev = row.get(field);
        const arr = Array.isArray(prev) ? prev.slice() : [];
        arr.push(pushedValue);
        row.set(field, arr);
      });
    }

    await row.save();
    return options.new ? row : row;
  };

  model.findOneAndDelete = async (filter = {}) => {
    const row = await model._origFindOne({ where: toWhereClause(filter) });
    if (!row) return null;
    await row.destroy();
    return row;
  };

  model.countDocuments = async (filter = {}) => model.count({ where: toWhereClause(filter) });

  model.updateMany = async (filter = {}, update = {}) => {
    const [affectedCount] = await model._origUpdate(update, { where: toWhereClause(filter) });
    return { modifiedCount: affectedCount };
  };

  model.deleteMany = async (filter = {}) => {
    const deletedCount = await model.destroy({ where: toWhereClause(filter) });
    return { deletedCount };
  };

  model.insertMany = async (docs = [], options = {}) => model.bulkCreate(docs, { returning: true, ...options });

  model.aggregate = async (pipeline = []) => {
    let rows = (await model._origFindAll({ raw: true })).map((row) => normalizeIdAliases(row));

    for (const stage of pipeline) {
      if (stage.$match) {
        const where = toWhereClause(stage.$match);
        const predicate = buildMatchPredicate(where);
        rows = rows.filter(predicate);
      } else if (stage.$group) {
        const groupBy = stage.$group._id;
        const grouped = new Map();

        rows.forEach((row) => {
          let groupKey = null;
          if (typeof groupBy === 'string' && groupBy.startsWith('$')) {
            groupKey = row[groupBy.slice(1)];
          } else if (groupBy && groupBy.$dateToString?.date) {
            const field = String(groupBy.$dateToString.date).replace('$', '');
            const date = new Date(row[field]);
            groupKey = Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
          } else {
            groupKey = groupBy;
          }

          const key = groupKey == null ? '__null__' : String(groupKey);
          if (!grouped.has(key)) {
            grouped.set(key, { _id: groupKey, count: 0 });
          }
          grouped.get(key).count += 1;
        });

        rows = [...grouped.values()];
      } else if (stage.$sort) {
        const entries = Object.entries(stage.$sort);
        rows.sort((a, b) => {
          for (const [key, order] of entries) {
            const av = a[key];
            const bv = b[key];
            if (av < bv) return Number(order) >= 0 ? -1 : 1;
            if (av > bv) return Number(order) >= 0 ? 1 : -1;
          }
          return 0;
        });
      } else if (stage.$lookup && stage.$lookup.from === 'users') {
        const users = await User._origFindAll({ raw: true });
        const byId = new Map(users.map((u) => [String(u.id), normalizeIdAliases(u)]));
        const asField = stage.$lookup.as;
        const localField = stage.$lookup.localField;

        rows = rows.map((row) => {
          const match = byId.get(String(row[localField] || ''));
          return { ...row, [asField]: match ? [match] : [] };
        });
      } else if (stage.$unwind) {
        const field = String(stage.$unwind).replace('$', '');
        const expanded = [];
        rows.forEach((row) => {
          const value = row[field];
          if (Array.isArray(value) && value.length) {
            value.forEach((entry) => expanded.push({ ...row, [field]: entry }));
          }
        });
        rows = expanded;
      } else if (stage.$project) {
        rows = rows.map((row) => {
          const projected = {};
          Object.entries(stage.$project).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('$')) {
              const path = value.slice(1).split('.');
              let current = row;
              path.forEach((segment) => {
                current = current ? current[segment] : undefined;
              });
              projected[key] = current;
            } else if (value === 1) {
              projected[key] = row[key];
            }
          });
          return projected;
        });
      }
    }

    return rows;
  };
};

[User, Complaint, Category, Notification, Feedback, QTable, SLAModel].forEach(patchModelCompat);

module.exports = {
  sequelize,
  User,
  Complaint,
  Category,
  Notification,
  Feedback,
  QTable,
  SLAModel
};
