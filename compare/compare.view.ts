namespace $.$$ {
	
	export class $hyoo_github_compare extends $.$hyoo_github_compare {

		@ $mol_mem
		project_ids( next? : string[] ) : string[] {
			const arg = this.$.$mol_state_arg.value( 'projects' , next?.join( ',' ) )

			return arg?.split( ',' ) ?? []
		}

		projects() {
			const ids = this.project_ids()
			return [ ... ids.map( ( id , index )=> this.Project( index ) ) , this.Project( ids.length ) ]
		}

		project_id( index : number , next? : string ) {
			let ids = this.project_ids()
			if( next !== undefined ) {
				ids = [ ... ids.slice( 0 , index ) , next ,  ... ids.slice( index + 1 ) ].filter( v => v )
				ids = [ ... new Set( ids ) ]
				ids = this.project_ids( ids )
			}
			return ids[ index ] || ''
		}

		@ $mol_mem
		capacities() {
			return this.projects().map( project => project.capacity() ).filter(Boolean)
		}

		@ $mol_mem
		project_labels() {
			return this.projects().map( project => project.id() ).filter(Boolean)
		}

	}
	
	export class $hyoo_github_compare_project extends $.$hyoo_github_compare_project {

		uri_project() {
			return 'https://api.github.com/repos/' + this.id()
		}
		
		uri_issues() {
			return this.uri_project() + '/issues?per_page=100'
		}
		
		@ $mol_mem
		project() {
			return this.$.$mol_fetch.json( this.uri_project() ) as {
				open_issues_count : number
				homepage : string
			}
		}

		homepage() {
			if( !this.id() ) return 'about:blank'
			return this.project().homepage || 'https://github.com/' + this.id()
		}

		@ $mol_mem_key
		issues_page( page : number ) {
			return this.$.$mol_fetch.json( this.uri_issues() + '&page=' + page ) as {
				created_at : string
			}[]
		}

		@ $mol_mem_key
		issues() {
			return this.$.$mol_range2(
				index => this.issues_page( Math.floor( index / 100 ) )[ index % 100 ] ,
				()=> this.project().open_issues_count
			)
		}

		@ $mol_mem
		capacity() {
			if( !this.id() ) return 0

			const key = 'project/' + this.id()
			
			try {

				const cache = this.$.$mol_shared.cache<{ date : string , capacity : number }>( key ) ?? {}

				if( cache.date ) {
					const age = new this.$.$mol_time_interval( cache.date + '/' ).duration.count( 'P1D' )
					if( age < 1 ) return cache.capacity
				}

			} catch( error ) {
				if( error instanceof Promise ) return $mol_fail_hidden( error )
				console.error( error )
			}

			const capacity = this.issues().reduce( ( sum , issue )=> {
				const age = new this.$.$mol_time_interval( issue.created_at + '/' )
				return sum + Math.ceil( age.duration.count( 'P1D' ) )
			} , 0 )

			const today  = new this.$.$mol_time_moment().merge({ hour : undefined , minute : undefined , second : undefined , offset : undefined })

			this.$.$mol_shared.cache( key , {
				date : today.toString() ,
				capacity ,
			} )

			return capacity
		}

		capacity_text() {
			if( !this.id() ) return ''
			return this.capacity().toLocaleString() + ' days'
		}
		
	}
	
}
