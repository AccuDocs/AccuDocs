import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface FolderProps {
  organizationId: string;
  clientId: string;
  parentId?: string | null;
  name: string;
  path: string;
  isSystem: boolean;
  metadata?: any;
  createdBy?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Folder extends Entity<FolderProps> {
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get parentId() { return this.props.parentId; }
  get name() { return this.props.name; }
  get path() { return this.props.path; }
  get isSystem() { return this.props.isSystem; }
  get metadata() { return this.props.metadata; }
  get createdBy() { return this.props.createdBy; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  private constructor(props: FolderProps, id?: string) {
    super(props, id);
  }

  public static create(props: FolderProps, id?: string): Result<Folder> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.clientId, argumentName: 'clientId' },
      { argument: props.name, argumentName: 'name' },
      { argument: props.path, argumentName: 'path' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Folder>(guardResult.getError() as string);
    return Result.ok<Folder>(new Folder(props, id));
  }
}
