as yet unclassified
source

	^ (SystemOrganization classesIn: 'SqueakXR') collect: [:cls |
		{
			#name -> (cls name).
			#definition -> (cls definition).
			#methods -> (cls selectors collect: [:selector |
				cls sourceCodeAt: selector]).
		} as: Dictionary]