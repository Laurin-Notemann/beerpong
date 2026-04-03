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

}
