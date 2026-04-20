import { injectable } from 'tsyringe';
import { IWarehouseRepository } from '../../domain/repositories/IWarehouseRepository';
import { Warehouse as WarehouseEntity } from '../../domain/entities/Warehouse.entity';
import { Warehouse as WarehouseModel } from '../../../../models';

function toEntity(raw: any): WarehouseEntity {
  const result = WarehouseEntity.create({
    orgId: raw.orgId,
    branchId: raw.branchId,
    name: raw.name,
    code: raw.code,
    address: raw.address,
    gstin: raw.gstin,
    isActive: raw.isActive,
    isDefault: raw.isDefault,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }, raw.id);
  if (result.isFailure) throw new Error(result.getError() as string);
  return result.getValue();
}

@injectable()
export class SequelizeWarehouseRepository implements IWarehouseRepository {
  async save(warehouse: WarehouseEntity): Promise<WarehouseEntity> {
    const [model] = await WarehouseModel.upsert({
      id: warehouse.id,
      orgId: warehouse.orgId,
      branchId: warehouse.branchId,
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address,
      gstin: warehouse.gstin,
      isActive: warehouse.isActive,
      isDefault: warehouse.isDefault,
    });
    const refreshed = await WarehouseModel.findByPk(model.id);
    return toEntity(refreshed!);
  }

  async findById(id: string, orgId: string): Promise<WarehouseEntity | null> {
    const row = await WarehouseModel.findOne({ where: { id, orgId } });
    return row ? toEntity(row) : null;
  }

  async findAll(orgId: string): Promise<WarehouseEntity[]> {
    const rows = await WarehouseModel.findAll({ where: { orgId }, order: [['name', 'ASC']] });
    return rows.map(toEntity);
  }

  async findDefault(orgId: string): Promise<WarehouseEntity | null> {
    const row = await WarehouseModel.findOne({ where: { orgId, isDefault: true } });
    return row ? toEntity(row) : null;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await WarehouseModel.update({ isActive: false }, { where: { id, orgId } });
  }
}
