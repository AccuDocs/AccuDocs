
import { v4 as uuidv4 } from 'uuid';

const isEntity = (v: any): v is Entity<any> => {
  return v instanceof Entity;
};

export abstract class Entity<T> {
  protected readonly _id: string;
  public readonly props: T;

  constructor(props: T, id?: string) {
    this._id = id ? id : uuidv4();
    this.props = props;
  }

  public get id(): string {
    return this._id;
  }

  public equals(object?: Entity<T>): boolean {
    if (object == null || object == undefined) {
      return false;
    }

    if (this === object) {
      return true;
    }

    if (!isEntity(object)) {
      return false;
    }

    return this._id === object._id;
  }

  public toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      id: this._id,
      ...(this.props as Record<string, unknown>),
    };

    for (const [key, value] of Object.entries(this as Record<string, unknown>)) {
      if (key.startsWith('_') && key !== '_id') {
        json[key.slice(1)] = value;
      }
    }

    return json;
  }
}
