const Footer = () => {
    return (
            <div className="dark:text-white-dark text-center ltr:sm:text-left rtl:sm:text-right p-6 pt-0 mt-auto">
            © {new Date().getFullYear()} Renova CRM. Todos los derechos reservados.
        </div>
    );
};

export default Footer;
