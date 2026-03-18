export type ProviderRequestErrorKind = 'provider_request_error';
export type ProviderName = 'sofascore';
export type ProviderResource = 'match_event';

export type ProviderRequestErrorProps = {
  provider: ProviderName;
  resource: ProviderResource;
  message: string;
  requestUrl: string;
  requestIdentifier: string;
  status?: number;
  causeMessage?: string;
  responseBodySnippet?: string;
};

export class ProviderRequestError extends Error {
  public readonly kind: ProviderRequestErrorKind;
  public readonly provider: ProviderName;
  public readonly resource: ProviderResource;
  public readonly requestUrl: string;
  public readonly requestIdentifier: string;
  public readonly status?: number;
  public readonly causeMessage?: string;
  public readonly responseBodySnippet?: string;

  constructor(props: ProviderRequestErrorProps) {
    super(props.message);
    this.name = 'ProviderRequestError';
    this.kind = 'provider_request_error';
    this.provider = props.provider;
    this.resource = props.resource;
    this.requestUrl = props.requestUrl;
    this.requestIdentifier = props.requestIdentifier;
    this.status = props.status;
    this.causeMessage = props.causeMessage;
    this.responseBodySnippet = props.responseBodySnippet;
  }
}
