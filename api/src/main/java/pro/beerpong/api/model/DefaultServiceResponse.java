package pro.beerpong.api.model;

public class DefaultServiceResponse extends ServiceResponse<Boolean> {
    public DefaultServiceResponse() {
        super(true);
    }

    public DefaultServiceResponse(ErrorCodes code) {
        super(code);
    }

    public static DefaultServiceResponse ok() {
        return new DefaultServiceResponse();
    }

    public static DefaultServiceResponse error(ErrorCodes code) {
        return new DefaultServiceResponse(code);
    }

    @Override
    public Boolean getData() {
        throw new UnsupportedOperationException("Default service response has no data. It should only be used to see if an operation was successful or not.");
    }
}
