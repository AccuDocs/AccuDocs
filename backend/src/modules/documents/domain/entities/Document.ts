import { Entity } from "../../../../shared/core/Entity";
import { Result } from "../../../../shared/core/Result";
import { Guard } from "../../../../shared/core/Guard";

export interface DocumentProps {
  organizationId: string;
  clientId: string;
  folderId: string;
  title: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  s3Key: string;
  version: number;
  metadata?: any;
  tags?: string[];
  isVerified: boolean;
  uploadedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Document extends Entity<DocumentProps> {
  get organizationId() { return this.props.organizationId; }
  get clientId() { return this.props.clientId; }
  get folderId() { return this.props.folderId; }
  get title() { return this.props.title; }
  get fileName() { return this.props.fileName; }
  get fileSize() { return this.props.fileSize; }
  get mimeType() { return this.props.mimeType; }
  get s3Key() { return this.props.s3Key; }
  get version() { return this.props.version; }
  get metadata() { return this.props.metadata; }
  get tags() { return this.props.tags || []; }
  get isVerified() { return this.props.isVerified; }
  get uploadedBy() { return this.props.uploadedBy; }
  get createdAt() { return this.props.createdAt; }
  get updatedAt() { return this.props.updatedAt; }

  private constructor(props: DocumentProps, id?: string) {
    super(props, id);
  }

  public static create(props: DocumentProps, id?: string): Result<Document> {
    const guards = [
      { argument: props.organizationId, argumentName: 'organizationId' },
      { argument: props.clientId, argumentName: 'clientId' },
      { argument: props.folderId, argumentName: 'folderId' },
      { argument: props.fileName, argumentName: 'fileName' },
      { argument: props.s3Key, argumentName: 's3Key' },
      { argument: props.uploadedBy, argumentName: 'uploadedBy' }
    ];
    const guardResult = Guard.againstNullOrUndefinedBulk(guards);
    if (!guardResult.isSuccess) return Result.fail<Document>(guardResult.getError() as string);
    return Result.ok<Document>(new Document(props, id));
  }
}
