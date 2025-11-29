declare module "js-beautify" {
	
	interface options {
		indent_size?: number;
		indent_char?: string;
		selector_separator_newline?: boolean;
		end_with_newline?: boolean;
		newline_between_rules?: boolean;
	}
	
	interface beautifyCSS {
		(value:string, options:options): string;
	}
	
    interface beautifyJS {
		(value:string, options:options): string;
	}
    
    interface beautifyHTML {
		(value:string, options:options): string;
	}
    
	export var css:beautifyCSS;
    export var js:beautifyJS;
    export var html:beautifyHTML;
    
}